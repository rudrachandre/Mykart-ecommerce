import { Injectable, NotFoundException } from '@nestjs/common';
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

    const verifiedPurchase = !!orderItem;

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

  async getProductReviews(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) throw new NotFoundException('Review not found');

    const productId = review.productId;

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    await this.recalculateRating(productId);

    return { message: 'Review deleted successfully' };
  }

  private async recalculateRating(productId: string) {
    const [aggregate] = await Promise.all([
      this.prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const averageRating = aggregate._avg.rating ?? 0;
    const reviewCount = aggregate._count.rating ?? 0;

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating,
        reviewCount,
      },
    });
  }
}
