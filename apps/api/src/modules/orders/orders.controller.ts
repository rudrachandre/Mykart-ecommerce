import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ReturnRequestDto } from './dto/return-request.dto';
import { ReplacementRequestDto } from './dto/replacement-request.dto';
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

  @Post(':id/cancel')
  cancelOrder(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(user.userId, id, dto.reason);
  }

  @Post(':id/return')
  requestReturn(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ReturnRequestDto,
  ) {
    return this.ordersService.requestReturn(user.userId, id, dto);
  }

  @Post(':id/replacement')
  requestReplacement(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ReplacementRequestDto,
  ) {
    return this.ordersService.requestReplacement(user.userId, id, dto);
  }

  @Get(':id/invoice')
  getInvoice(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.ordersService.getInvoice(id, user.userId);
  }
}
