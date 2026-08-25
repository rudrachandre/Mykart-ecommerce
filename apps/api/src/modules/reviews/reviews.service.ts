import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateReview(userId: string, dto: CreateReviewDto) {
    const { productId, rating, title, comment } = dto;

    // Check if the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Check if the user has a verified purchase
    // A verified purchase means the user has a completed/delivered order with this product
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        order: {
          userId,
          status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] }, // Assuming they can review if paid
        },
        productId,
      },
    });

    const verifiedPurchase = !!orderItem;

    // Upsert the review
    // We only allow one review per user per product
    const existingReview = await this.prisma.review.findFirst({
      where: { userId, productId },
    });

    if (existingReview) {
      return this.prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, title, comment, verifiedPurchase },
      });
    }

    return this.prisma.review.create({
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

    return this.prisma.review.delete({
      where: { id: reviewId },
    });
  }
}
