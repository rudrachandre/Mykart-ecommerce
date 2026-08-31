import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permissions';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const p = page ? parseInt(page, 10) : 1;
      const l = limit ? parseInt(limit, 10) : 10;
      return await this.reviewsService.getProductReviews(productId, p, l);
    } catch {
      return {
        items: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
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
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    return this.reviewsService.deleteReview(user.userId, user.role, id);
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  reportReview(@Param('id') id: string) {
    return this.reviewsService.reportReview(id);
  }

  @Get('reported')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REVIEW_MODERATE)
  getReportedReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.reviewsService.getReportedReviews(p, l);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REVIEW_MODERATE)
  moderateReview(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.reviewsService.moderateReview(id, status);
  }
}
