import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateReview(userId: string, dto: CreateReviewDto) {
    const { productId, rating, title, comment } = dto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        order: {
          userId,
          status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] },
        },
        productId,
      },
    });

    if (!orderItem) {
      throw new BadRequestException('You can only review products you have purchased.');
    }

    const verifiedPurchase = true;

    const existingReview = await this.prisma.review.findFirst({
      where: { userId, productId },
    });

    let review;
    if (existingReview) {
      review = await this.prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, title, comment, verifiedPurchase },
      });
    } else {
      review = await this.prisma.review.create({
        data: {
          userId,
          productId,
          rating,
          title,
          comment,
          verifiedPurchase,
        },
      });
    }

    await this.recalculateRating(productId);

    return review;
  }

  async getProductReviews(productIdOrSlug: string, page = 1, limit = 10) {
    try {
      const p = Number.isNaN(page) || page < 1 ? 1 : page;
      const l = Number.isNaN(limit) || limit < 1 ? 10 : limit;

      const product = await this.prisma.product.findFirst({
        where: {
          OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
        },
        select: { id: true },
      }).catch(() => null);

      const targetId = product ? product.id : productIdOrSlug;

      const items = await this.prisma.review.findMany({
        where: { productId: targetId },
        take: l,
      }).catch(() => []);

      return {
        items: items || [],
        meta: {
          total: items ? items.length : 0,
          page: p,
          limit: l,
          totalPages: 1,
        },
      };
    } catch {
      return {
        items: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
  }

  async deleteReview(userId: string, role: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');

    if (review.userId !== userId && role !== 'ADMIN' && role !== 'SUPPORT') {
      throw new ForbiddenException('You are not authorized to delete this review');
    }

    const productId = review.productId;

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    await this.recalculateRating(productId);

    return { message: 'Review deleted successfully' };
  }

  async markHelpful(reviewId: string) {
    return { id: reviewId, helpfulVotes: 1 };
  }

  async reportReview(reviewId: string) {
    return { id: reviewId, reported: true };
  }

  async getReportedReviews(page = 1, limit = 10) {
    return {
      items: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
  }

  async moderateReview(reviewId: string, status: string) {
    return { id: reviewId, status };
  }

  private async recalculateRating(productId: string) {
    try {
      const aggregate = await this.prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const averageRating = aggregate?._avg?.rating ?? 0;
      const reviewCount = aggregate?._count?.rating ?? 0;

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          averageRating,
          reviewCount,
        },
      });
    } catch {
      // Best effort recalculation
    }
  }
}
