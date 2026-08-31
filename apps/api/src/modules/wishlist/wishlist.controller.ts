import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getWishlist(@CurrentUser() user: { userId: string }) {
    return this.wishlistService.getWishlist(user.userId);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  addItem(
    @CurrentUser() user: { userId: string },
    @Body() dto: AddToWishlistDto,
  ) {
    return this.wishlistService.addItem(user.userId, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  removeItem(
    @CurrentUser() user: { userId: string },
    @Param('id') itemId: string,
  ) {
    return this.wishlistService.removeItem(user.userId, itemId);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  mergeWishlist(
    @CurrentUser() user: { userId: string },
    @Body() dto: { productIds: string[] },
  ) {
    return this.wishlistService.mergeWishlist(user.userId, dto.productIds);
  }

  @Get('guest')
  getGuestWishlist(@Query('productIds') productIdsString?: string) {
    if (!productIdsString) return { items: [] };
    const productIds = productIdsString.split(',').filter(Boolean);
    return this.wishlistService.getGuestWishlist(productIds);
  }
}
