import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permissions';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { RefundProcessDto } from '../orders/dto/refund-process.dto';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('users')
  @RequirePermissions(PERMISSIONS.USER_READ)
  getUsers(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers(skip, take, search, role);
  }

  @Get('sellers')
  @RequirePermissions(PERMISSIONS.SELLER_READ)
  getSellers(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSellers(skip, take, search);
  }

  @Get('sellers/:id')
  @RequirePermissions(PERMISSIONS.SELLER_READ)
  getSeller(@Param('id') id: string) {
    return this.adminService.getSellerById(id);
  }

  @Get('orders')
  @RequirePermissions(PERMISSIONS.ORDER_READ)
  getOrders(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(skip, take, search, status);
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDER_READ)
  getOrderDetail(@Param('id') id: string) {
    return this.adminService.getOrderDetail(id);
  }

  @Post('orders/:id/refund')
  @RequirePermissions(PERMISSIONS.ORDER_REFUND)
  processRefund(@Param('id') id: string, @Body() dto: RefundProcessDto) {
    return this.adminService.processRefund(id, dto);
  }

  @Get('products')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  getAdminProducts(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminProducts(skip, take, search);
  }

  @Patch('users/:id/role')
  @RequirePermissions(PERMISSIONS.USER_ROLE_MANAGE)
  changeUserRole(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.changeUserRole(admin.userId, id, dto.role);
  }

  @Patch('sellers/:id/status')
  @RequirePermissions(PERMISSIONS.SELLER_APPROVE, PERMISSIONS.SELLER_SUSPEND)
  setSellerStatus(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSellerStatusDto,
  ) {
    return this.adminService.setSellerStatus(admin.userId, id, dto.status);
  }

  @Patch('products/:id/status')
  @RequirePermissions(PERMISSIONS.PRODUCT_MODERATE)
  setProductStatus(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.adminService.setProductStatus(admin.userId, id, dto.status);
  }

  @Get('payments')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  getPayments(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    return this.adminService.getPayments(skip, take);
  }

  @Get('refunds')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  getRefunds(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    return this.adminService.getRefunds(skip, take);
  }

  @Get('reviews')
  @RequirePermissions(PERMISSIONS.REVIEW_READ)
  getReviews(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('reported') reported?: string,
  ) {
    const isReported = reported === 'true';
    return this.adminService.getReviews(skip, take, isReported);
  }

  @Patch('reviews/:id/status')
  @RequirePermissions(PERMISSIONS.REVIEW_MODERATE)
  updateReviewStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateReviewStatus(id, body.status);
  }

  @Delete('reviews/:id')
  @RequirePermissions(PERMISSIONS.REVIEW_MODERATE)
  deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReview(id);
  }

  @Get('settings')
  @RequirePermissions(PERMISSIONS.USER_ROLE_MANAGE)
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @RequirePermissions(PERMISSIONS.USER_ROLE_MANAGE)
  updateSettings(@Body() dto: any) {
    return this.adminService.updateSettings(dto);
  }
}
