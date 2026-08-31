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
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
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
