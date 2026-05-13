import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService, // 🔥 needed for refresh
  ) {}

  // ✅ Public route
  @Get('register')
  test() {
    return 'register working';
  }

  // ✅ Send OTP
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  // ✅ Verify OTP → returns access + refresh tokens
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  // 🔐 Get logged-in user
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return {
      message: 'User profile fetched successfully',
      user: req.user,
    };
  }

  // 👑 ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  getAdminData(@Request() req) {
    return {
      message: 'Admin access granted',
      user: req.user,
    };
  }

  // 🔄 REFRESH TOKEN
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    let payload;

    try {
      payload = this.jwtService.verify(dto.refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload || typeof payload !== 'object' || !('userId' in payload)) {
      throw new BadRequestException('Refresh token payload is invalid');
    }

    return this.authService.refreshToken(payload.userId as string, dto.refreshToken);
  }

  // 🚪 LOGOUT
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Request() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.userId);
  }

  // 👑 PROMOTE USER TO ADMIN (temporary/dev utility)
  @UseGuards(JwtAuthGuard)
  @Post('promote-to-admin')
  async promoteToAdmin(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;

    const updatedUser = await this.authService.promoteUserToAdmin(userId);

    return {
      message: 'User promoted to ADMIN',
      user: updatedUser,
    };
  }
}
