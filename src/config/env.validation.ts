import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EnvValidation {
  @IsNumber()
  @Type(() => Number)
  PORT!: number;

  @IsString()
  @Type(() => String)
  NODE_ENV!: string;

  @IsString()
  @Type(() => String)
  DATABASE_URL!: string;

  @IsString()
  @Type(() => String)
  JWT_SECRET!: string;

  @IsString()
  @Type(() => String)
  JWT_EXPIRES_IN!: string;

  @IsString()
  @Type(() => String)
  JWT_REFRESH_EXPIRES_IN!: string;
}
