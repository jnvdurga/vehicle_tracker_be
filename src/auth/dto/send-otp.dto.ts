import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class SendOtpDto {
  @Transform(({ value }) => String(value))
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid phone number',
  })
  phone!: string;
}
