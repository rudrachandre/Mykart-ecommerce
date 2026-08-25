import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: { userId: string }) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  addItem(@CurrentUser() user: { userId: string }, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user.userId, dto);
  }

  @Put('items/:id')
  updateItemQuantity(
    @CurrentUser() user: { userId: string },
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(user.userId, itemId, dto);
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUser() user: { userId: string },
    @Param('id') itemId: string,
  ) {
    return this.cartService.removeItem(user.userId, itemId);
  }
}
