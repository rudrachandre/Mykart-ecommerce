import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: { userId: string }) {
    return this.wishlistService.getWishlist(user.userId);
  }

  @Post('items')
  addItem(
    @CurrentUser() user: { userId: string },
    @Body() dto: AddToWishlistDto,
  ) {
    return this.wishlistService.addItem(user.userId, dto);
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUser() user: { userId: string },
    @Param('id') itemId: string,
  ) {
    return this.wishlistService.removeItem(user.userId, itemId);
  }
}
