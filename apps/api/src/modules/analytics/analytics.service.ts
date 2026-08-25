import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    userId: string,
    action: string,
    entityId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityId,
        details: details || {},
        ipAddress,
        userAgent,
      },
    });
  }

  async getAuditLogs(limit: number = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async getDashboardStats() {
    const totalUsers = await this.prisma.user.count();
    const totalOrders = await this.prisma.order.count();
    const totalRevenueData = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: 'CANCELLED' } },
    });
    const totalProducts = await this.prisma.product.count();

    return {
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenueData._sum.total || 0,
      totalProducts,
    };
  }
}
