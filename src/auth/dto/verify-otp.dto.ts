import { Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @Transform(({ value }) => String(value))
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid phone number',
  })
  phone!: string;

  @Transform(({ value }) => String(value))
  @Matches(/^\d{6}$/, {
    message: 'OTP must be 6 digits',
  })
  otp!: string;
}
