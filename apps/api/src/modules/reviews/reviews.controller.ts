import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createOrUpdateReview(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createOrUpdateReview(user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteReview(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.reviewsService.deleteReview(user.userId, id);
  }
}
