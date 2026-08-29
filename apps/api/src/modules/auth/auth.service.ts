import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { Role } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private analyticsService: AnalyticsService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Default role is CUSTOMER, but admin could pass ADMIN if properly authorized in a different route.
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: Role.CUSTOMER,
      },
    });

    return this.generateAuthResponse(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.analyticsService.logAction(user.id, 'USER_LOGIN', undefined, {
      email: dto.email,
    });

    return this.generateAuthResponse(user.id, user.role);
  }

  async logout(refreshToken: string) {
    // Hash the incoming opaque token
    const tokenHash = this.hashToken(refreshToken);

    // Find it in DB
    const rt = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (rt) {
      // Revoke in DB
      await this.prisma.refreshToken.update({
        where: { id: rt.id },
        data: { isRevoked: true },
      });
      // Delete from Redis
      await this.redis.del(`rt:${tokenHash}`);
    }
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    // Check Redis first for speed, but if it's revoked or missing, fallback to DB check
    const isRevokedInRedis = await this.redis.get(`revoked:${tokenHash}`);

    const rtRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!rtRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse Detection: If the token is already revoked, this is a reuse attempt (token theft)
    if (rtRecord.isRevoked || isRevokedInRedis) {
      await this.revokeFamily(rtRecord.familyId);
      throw new UnauthorizedException(
        'Token reuse detected. All sessions revoked.',
      );
    }

    // Check expiration
    if (rtRecord.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke the old token (Rotation)
    await this.prisma.refreshToken.update({
      where: { id: rtRecord.id },
      data: { isRevoked: true },
    });
    // Optional: mark revoked in Redis for 1 hour to block fast re-use attempts without hitting DB
    await this.redis.set(`revoked:${tokenHash}`, 'true', 3600);

    // Generate new tokens keeping the same family
    return this.generateAuthResponse(
      rtRecord.userId,
      rtRecord.user.role,
      rtRecord.familyId,
    );
  }

  async logoutAll(userId: string) {
    // Invalidate every refresh token for the user: "log out from all devices".
    await this.revokeAllUserTokens(userId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    // Silent for unknown emails — prevents account enumeration.
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // One-time token, 15 minute TTL, stored hashed (same pattern as refresh tokens).
    await this.redis.set(`pwreset:${tokenHash}`, user.id, 15 * 60);

    await this.mailService.sendPasswordResetEmail(user.email, rawToken);
    await this.analyticsService.logAction(
      user.id,
      'PASSWORD_RESET_REQUESTED',
      undefined,
      { email: dto.email },
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);

    const userId = await this.redis.get(`pwreset:${tokenHash}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Consume the token immediately: single use.
    await this.redis.del(`pwreset:${tokenHash}`);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // A password reset invalidates every existing session.
    await this.revokeAllUserTokens(userId);

    await this.analyticsService.logAction(userId, 'PASSWORD_RESET_COMPLETED');
  }

  private async revokeAllUserTokens(userId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, isRevoked: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    for (const t of tokens) {
      await this.redis.set(`revoked:${t.tokenHash}`, 'true', 3600);
      await this.redis.del(`rt:${t.tokenHash}`);
    }
  }

  private async revokeFamily(familyId: string) {
    // Revoke all tokens in family
    const tokens = await this.prisma.refreshToken.findMany({
      where: { familyId },
    });

    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { isRevoked: true },
    });

    // Revoke in Redis
    for (const t of tokens) {
      await this.redis.set(`revoked:${t.tokenHash}`, 'true', 3600);
      await this.redis.del(`rt:${t.tokenHash}`);
    }
  }

  private async generateAuthResponse(
    userId: string,
    role: string,
    familyId?: string,
  ) {
    const jti = crypto.randomUUID();
    const accessToken = this.jwtService.sign({
      sub: userId,
      role,
      jti,
    });

    const newFamilyId = familyId || crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        familyId: newFamilyId,
        expiresAt,
      },
    });

    // Store active session in Redis
    await this.redis.set(`rt:${tokenHash}`, userId, 7 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken: rawRefreshToken, // Only returned once, never logged
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
