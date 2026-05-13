import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import type { SignOptions } from 'jsonwebtoken';
import { RedisService } from './../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  // 🔐 OTP Generator
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 🔐 Generate Tokens
  private generateTokens(user: any) {
    const payload: JwtPayload = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
    };

    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN');

    if (!refreshExpires) {
      throw new Error('JWT_REFRESH_EXPIRES_IN is required');
    }

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpires as SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  // 🔒 Hash helper
  private async hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  // 🚀 Promote to Admin
  async promoteUserToAdmin(userId: string) {
    return this.authRepository.updateUserRole(userId, Role.ADMIN);
  }

  // 📩 SEND OTP (Redis)
  async sendOtp(phone: string) {
    let user = await this.authRepository.findUserByPhone(phone);

    if (!user) {
      user = await this.authRepository.createUser(phone);
    }

    const redis = this.redisService.getClient();

    // 🔥 Cooldown check (simple & correct)
    const existing = await redis.get(`otp:${phone}`);

    if (existing) {
      throw new BadRequestException('OTP already sent. Please wait.');
    }

    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    console.log('OTP:', otp); // ⚠️ remove in production

    // ⏳ store in Redis (5 min expiry)
    await redis.set(
      `otp:${phone}`,
      JSON.stringify({
        code: hashedOtp,
        attempts: 0,
      }),
      'EX',
      300,
    );

    return {
      message: 'OTP sent successfully',
    };
  }

  // ✅ VERIFY OTP (Redis)
  async verifyOtp(phone: string, otp: string) {
    const redis = this.redisService.getClient();

    const data = await redis.get(`otp:${phone}`);

    if (!data) {
      throw new BadRequestException('OTP expired or not found');
    }

    const parsed = JSON.parse(data);

    if (parsed.attempts >= 5) {
      throw new BadRequestException('Too many attempts');
    }

    const isMatch = await bcrypt.compare(otp, parsed.code);

    if (!isMatch) {
      parsed.attempts += 1;

      await redis.set(`otp:${phone}`, JSON.stringify(parsed), 'EX', 300);

      throw new BadRequestException('Invalid OTP');
    }

    // ✅ success → delete OTP
    await redis.del(`otp:${phone}`);

    const user = await this.authRepository.verifyUser(phone);

    const tokens = this.generateTokens(user);

    const hashedRefreshToken = await this.hashData(tokens.refreshToken);

    await this.authRepository.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      message: 'OTP verified successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // 🔄 REFRESH TOKEN
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.authRepository.findUserById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = this.generateTokens(user);

    const hashedRefreshToken = await this.hashData(tokens.refreshToken);

    await this.authRepository.updateRefreshToken(user.id, hashedRefreshToken);

    return tokens;
  }

  // 🚪 LOGOUT
  async logout(userId: string) {
    await this.authRepository.updateRefreshToken(userId, null);

    return {
      message: 'Logged out successfully',
    };
  }
}
