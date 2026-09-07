import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
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

  @Get('overview')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  async getAnalyticsOverview(
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.analyticsService.getAnalyticsOverview({
        range,
        startDate,
        endDate,
      });
    } catch (err: any) {
      console.error(
        '[AnalyticsController] error in getAnalyticsOverview:',
        err,
      );
      throw err;
    }
  }

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  async getDashboardStats() {
    try {
      return await this.analyticsService.getDashboardStats();
    } catch (err: any) {
      console.error('[AnalyticsController] error in getDashboardStats:', err);
      throw err;
    }
  }

  @Get('trends')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  async getAnalyticsTrends(@Query('range') range?: string) {
    try {
      const data = await this.analyticsService.getAnalyticsTrends(range);
      if (data) return data;
    } catch (err: any) {
      console.error('[AnalyticsController] error in getAnalyticsTrends:', err);
    }
    return {
      trends: [],
      customerGrowth: [],
      topProducts: [],
      topCategories: [],
      topSellers: [],
    };
  }

  @Get('audit-logs')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  async getAuditLogs(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    try {
      const logs = await this.analyticsService.getAuditLogs(
        skip,
        take,
        action,
        userId,
      );
      if (logs) return logs;
    } catch (err: any) {
      console.error('[AnalyticsController] error in getAuditLogs:', err);
    }
    return { logs: [], total: 0 };
  }
}
