import { Controller, Get, UseGuards, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permissions';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  async getDashboardStats() {
    try {
      return await this.analyticsService.getDashboardStats();
    } catch (err: any) {
      console.error('[AnalyticsController] error in getDashboardStats:', err);
      return {
        totalUsers: 0,
        totalCustomers: 0,
        totalSellers: 0,
        newCustomers: 0,
        totalOrders: 0,
        ordersToday: 0,
        ordersLast7Days: 0,
        ordersLast30Days: 0,
        orderDistribution: {},
        totalRevenue: 0,
        revenueToday: 0,
        revenueLast7Days: 0,
        revenueLast30Days: 0,
        avgOrderValue: 0,
        sellerDistribution: {},
        totalProducts: 0,
        activeProducts: 0,
        outOfStockCount: 0,
        availableStock: 0,
        reservedStock: 0,
        lowStockCount: 0,
        totalInventoryValue: 0,
        paymentDistribution: {},
        totalRefunds: 0,
        totalRefundAmount: 0,
        totalReturns: 0,
        approvedReturns: 0,
        rejectedReturns: 0,
        totalReplacements: 0,
        totalReviews: 0,
        avgRating: 0,
        reportedReviewsCount: 0,
        pendingModerationCount: 0,
        totalCoupons: 0,
        activeCoupons: 0,
        couponsUsedCount: 0,
      };
    }
  }

  @Get('trends')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  getAnalyticsTrends(@Query('range') range?: string) {
    return this.analyticsService.getAnalyticsTrends(range);
  }

  @Get('audit-logs')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  getAuditLogs(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.analyticsService.getAuditLogs(skip, take, action, userId);
  }
}
