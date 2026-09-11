import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('AdminService - Role Change Session Revocation (Finding 7)', () => {
  let service: AdminService;
  let prismaService: any;
  let authService: any;
  let analyticsService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    authService = {
      logoutAll: jest.fn().mockResolvedValue(undefined),
    };

    analyticsService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuthService, useValue: authService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should revoke all refresh token sessions when user role changes', async () => {
    const adminUserId = 'admin-1';
    const targetUserId = 'user-1';
    const existingUser = { id: targetUserId, role: Role.CUSTOMER };
    const updatedUser = { id: targetUserId, role: Role.SELLER, name: 'Test', email: 'test@example.com' };

    prismaService.user.findUnique.mockResolvedValue(existingUser);
    prismaService.user.update.mockResolvedValue(updatedUser);

    const result = await service.changeUserRole(adminUserId, targetUserId, Role.SELLER);

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: targetUserId } });
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: targetUserId },
      data: { role: Role.SELLER },
      select: { id: true, name: true, email: true, role: true },
    });
    expect(authService.logoutAll).toHaveBeenCalledWith(targetUserId);
    expect(analyticsService.logAction).toHaveBeenCalled();
    expect(result).toEqual(updatedUser);
  });

  it('should not revoke sessions if target user role is identical (idempotent)', async () => {
    const adminUserId = 'admin-1';
    const targetUserId = 'user-1';
    const existingUser = { id: targetUserId, role: Role.CUSTOMER };

    prismaService.user.findUnique.mockResolvedValue(existingUser);

    const result = await service.changeUserRole(adminUserId, targetUserId, Role.CUSTOMER);

    expect(prismaService.user.update).not.toHaveBeenCalled();
    expect(authService.logoutAll).not.toHaveBeenCalled();
    expect(result).toEqual(existingUser);
  });

  it('should throw NotFoundException if user does not exist', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.changeUserRole('admin-1', 'nonexistent', Role.SELLER),
    ).rejects.toThrow(NotFoundException);

    expect(authService.logoutAll).not.toHaveBeenCalled();
  });
});
