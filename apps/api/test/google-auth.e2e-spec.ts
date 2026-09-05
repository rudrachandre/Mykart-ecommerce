import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../src/modules/users/users.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { MailService } from '../src/common/mail/mail.service';
import { Role } from '@prisma/client';

describe('AuthService - Google OAuth', () => {
  let authService: AuthService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisService, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock_access_token') } },
        { provide: UsersService, useValue: { findByEmail: jest.fn() } },
        { provide: AnalyticsService, useValue: { logAction: jest.fn() } },
        { provide: MailService, useValue: { sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('creates new CUSTOMER user when google user is not found', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    const mockUser = { id: 'u-1', email: 'new@google.com', role: Role.CUSTOMER, googleId: 'g-123' };
    prismaService.user.create.mockResolvedValue(mockUser);

    const result = await authService.validateGoogleUser({
      googleId: 'g-123',
      email: 'new@google.com',
      name: 'Google User',
      avatar: 'https://example.com/photo.jpg',
    });

    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Google User',
        email: 'new@google.com',
        passwordHash: null,
        googleId: 'g-123',
        avatar: 'https://example.com/photo.jpg',
        emailVerified: true,
        role: Role.CUSTOMER,
      },
    });
    expect(result.tokens.accessToken).toBe('mock_access_token');
  });

  it('links existing email user with googleId without changing existing role', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    const existingUser = { id: 'u-existing', email: 'existing@mykart.com', role: Role.SELLER, avatar: null };
    (authService as any).usersService.findByEmail.mockResolvedValue(existingUser);
    
    const updatedUser = { ...existingUser, googleId: 'g-456', emailVerified: true };
    prismaService.user.update.mockResolvedValue(updatedUser);

    const result = await authService.validateGoogleUser({
      googleId: 'g-456',
      email: 'existing@mykart.com',
      name: 'Existing User',
    });

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'u-existing' },
      data: {
        googleId: 'g-456',
        emailVerified: true,
        avatar: undefined,
      },
    });
    expect(result.tokens.accessToken).toBe('mock_access_token');
  });
});
