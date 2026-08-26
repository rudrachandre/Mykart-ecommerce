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
    const [totalUsers, totalOrders, totalRevenueData, totalProducts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      this.prisma.product.count(),
    ]);

    return {
      totalUsers,
      totalOrders,
      // Prisma aggregates a Decimal column into a Decimal that JSON-serializes
      // as a string ("1049.99"); coerce so clients receive a real number and
      // numeric formatting (.toFixed etc.) can never crash.
      totalRevenue: Number(totalRevenueData._sum.total ?? 0),
      totalProducts,
    };
  }
}
