import { IsString, Length, Matches, MinLength } from 'class-validator';

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

export class RegisterDto {
  @IsString()
  @Length(2, 120)
  full_name: string;

  @IsString()
  @Matches(PHONE_REGEX, {
    message: 'phone_number must be a valid phone number',
  })
  phone_number: string;

  @IsString()
  @MinLength(8)
  password: string;
}
