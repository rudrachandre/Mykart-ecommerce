import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getOrders(@CurrentUser() user: { userId: string }) {
    return this.ordersService.getOrders(user.userId);
  }

  @Get(':id')
  getOrderById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderById(user.userId, id);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: { userId: string }, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  @Post('verify-payment')
  verifyPayment(
    @CurrentUser() user: { userId: string },
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.ordersService.verifyPayment(user.userId, dto);
  }
}
