import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ApiException } from '../common/exceptions/api-exception';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp/otp.service';

// Fixed bcrypt hash of a non-secret placeholder, compared against on login
// when no user is found — keeps response timing independent of whether the
// phone number exists, so login can't be used to enumerate registered users.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-safety-placeholder', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOne({
      where: { phoneNumber: dto.phone_number },
    });
    if (existing) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'PHONE_ALREADY_REGISTERED',
        'This phone number is already registered.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      fullName: dto.full_name,
      phoneNumber: dto.phone_number,
      passwordHash,
      role: UserRole.CUSTOMER,
    });
    const saved = await this.usersRepository.save(user);

    await this.otpService.generateAndSend(saved.phoneNumber);

    return {
      id: saved.id,
      full_name: saved.fullName,
      phone_number: saved.phoneNumber,
      message: 'Registered. An OTP has been sent to verify your account.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.otpService.verify(dto.phone_number, dto.code);

    const user = await this.usersRepository.findOne({
      where: { phoneNumber: dto.phone_number },
    });
    if (!user) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_OTP',
        'No pending registration found for this phone number.',
      );
    }

    user.isVerified = true;
    await this.usersRepository.save(user);

    return { message: 'Phone number verified. You can now log in.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { phoneNumber: dto.phone_number },
    });
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || !user.isVerified || !user.isActive) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Invalid phone number or password.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      phone_number: user.phoneNumber,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        full_name: user.fullName,
        phone_number: user.phoneNumber,
        role: user.role,
      },
    };
  }
}
