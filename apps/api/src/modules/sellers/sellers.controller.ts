import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { SellersService } from './sellers.service';
import { OnboardSellerDto } from './dto/onboard-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('sellers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post('onboard')
  onboard(
    @CurrentUser() user: { userId: string },
    @Body() dto: OnboardSellerDto,
  ) {
    return this.sellersService.onboard(user.userId, dto);
  }

  @Get('profile')
  @Roles(Role.SELLER, Role.ADMIN)
  getProfile(@CurrentUser() user: { userId: string }) {
    return this.sellersService.getProfile(user.userId);
  }

  @Get('dashboard')
  @Roles(Role.SELLER, Role.ADMIN)
  getDashboard(@CurrentUser() user: { userId: string }) {
    return this.sellersService.getDashboard(user.userId);
  }

  @Put('profile')
  @Roles(Role.SELLER, Role.ADMIN)
  updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateSellerDto,
  ) {
    return this.sellersService.updateProfile(user.userId, dto);
  }

  @Get('products')
  @Roles(Role.SELLER, Role.ADMIN)
  getSellerProducts(@CurrentUser() user: { userId: string }) {
    return this.sellersService.getSellerProducts(user.userId);
  }

  @Get('orders')
  @Roles(Role.SELLER, Role.ADMIN)
  getSellerOrders(@CurrentUser() user: { userId: string }) {
    return this.sellersService.getSellerOrders(user.userId);
  }

  @Put('orders/:orderId/status')
  @Roles(Role.SELLER, Role.ADMIN)
  updateOrderStatus(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.sellersService.updateOrderStatus(user.userId, orderId, dto);
  }

  @Get('orders/:orderId')
  @Roles(Role.SELLER, Role.ADMIN)
  getOrderDetail(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
  ) {
    return this.sellersService.getOrderDetail(user.userId, orderId);
  }

  @Post('orders/:orderId/returns/:returnId/approve')
  @Roles(Role.SELLER, Role.ADMIN)
  approveReturn(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Param('returnId') returnId: string,
  ) {
    return this.sellersService.approveReturn(user.userId, orderId, returnId);
  }

  @Post('orders/:orderId/returns/:returnId/reject')
  @Roles(Role.SELLER, Role.ADMIN)
  rejectReturn(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Param('returnId') returnId: string,
  ) {
    return this.sellersService.rejectReturn(user.userId, orderId, returnId);
  }

  @Get('reviews')
  @Roles(Role.SELLER, Role.ADMIN)
  getSellerReviews(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.sellersService.getSellerReviews(user.userId, p, l);
  }

  @Get('analytics')
  @Roles(Role.SELLER, Role.ADMIN)
  getSellerAnalytics(@CurrentUser() user: { userId: string }) {
    return this.sellersService.getSellerAnalytics(user.userId);
  }
}
