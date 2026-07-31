import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { ApiException } from '../../common/exceptions/api-exception';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { OTP_SENDER } from './otp-sender.port';
import type { OtpSenderPort } from './otp-sender.port';

const OTP_TTL_SECONDS = 300;
const MAX_WRONG_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(OTP_SENDER) private readonly sender: OtpSenderPort,
  ) {}

  private key(phoneNumber: string): string {
    return `otp:${phoneNumber}`;
  }

  async generateAndSend(phoneNumber: string): Promise<void> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = this.key(phoneNumber);
    await this.redis.del(key);
    await this.redis.hset(key, { code, attempts: '0' });
    await this.redis.expire(key, OTP_TTL_SECONDS);
    await this.sender.send(phoneNumber, code);
  }

  // Throws ApiException(OTP_EXPIRED | INVALID_OTP | OTP_ATTEMPTS_EXCEEDED) on
  // failure; resolves silently on a correct code (Req 4-5).
  async verify(phoneNumber: string, submittedCode: string): Promise<void> {
    const key = this.key(phoneNumber);
    const stored = await this.redis.hgetall(key);

    if (!stored.code) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'OTP_EXPIRED',
        'This OTP has expired or was never issued. Request a new one.',
      );
    }

    if (stored.code === submittedCode) {
      await this.redis.del(key);
      return;
    }

    const attempts = await this.redis.hincrby(key, 'attempts', 1);
    if (attempts > MAX_WRONG_ATTEMPTS) {
      await this.redis.del(key);
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many incorrect attempts. Request a new OTP.',
      );
    }

    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'INVALID_OTP',
      'The OTP code is incorrect.',
    );
  }
}
