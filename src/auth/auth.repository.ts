import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Find user by phone number
   */
  async findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Create a new user with phone number
   */
  async createUser(phone: string) {
    return this.prisma.user.create({
      data: { phone },
    });
  }

  /**
   * Find the latest OTP for a phone number
   */
  async findLatestOtp(phone: string) {
    return this.prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new OTP record
   */
  async createOtp(phone: string, code: string, expiresAt: Date) {
    return this.prisma.otp.create({
      data: {
        phone,
        code,
        attempts: 0,
        expiresAt,
      },
    });
  }

  /**
   * Delete all OTPs for a phone number (cleanup old OTPs)
   */
  async deleteOtpsByPhone(phone: string) {
    return this.prisma.otp.deleteMany({
      where: { phone },
    });
  }

  /**
   * Increment OTP attempt count by ID
   */
  async incrementOtpAttempts(otpId: string) {
    return this.prisma.otp.update({
      where: { id: otpId },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Mark user as verified
   */
  async verifyUser(phone: string) {
    return this.prisma.user.update({
      where: { phone },
      data: {
        isVerified: true,
      },
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: { set: role } },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update refresh token for user
   */
  async updateRefreshToken(userId: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }
}
