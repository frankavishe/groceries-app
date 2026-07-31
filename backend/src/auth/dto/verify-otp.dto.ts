import { IsString, Matches } from 'class-validator';

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

export class VerifyOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, {
    message: 'phone_number must be a valid phone number',
  })
  phone_number: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'code must be a 6-digit numeric code' })
  code: string;
}
