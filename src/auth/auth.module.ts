import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const jwtSecret = config.get<string>('JWT_SECRET');
        const jwtExpiresIn = config.get<string>('JWT_EXPIRES_IN');

        if (!jwtSecret) {
          throw new Error('JWT_SECRET environment variable is required');
        }

        if (!jwtExpiresIn) {
          throw new Error('JWT_EXPIRES_IN environment variable is required');
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
})
export class AuthModule {}
