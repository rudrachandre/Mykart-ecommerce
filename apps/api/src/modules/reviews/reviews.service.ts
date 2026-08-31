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

    // Verified purchase validation: only allow reviewing if they purchased and received/shipped the product
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

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, status: 'APPROVED' },
        include: {
          user: { select: { name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { productId, status: 'APPROVED' },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteReview(userId: string, role: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');

    // Review ownership: only owner or ADMIN/SUPPORT can delete
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
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulVotes: { increment: 1 } },
    });
  }

  async reportReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { reported: true },
    });
  }

  async getReportedReviews(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { reported: true },
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { reported: true },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderateReview(reviewId: string, status: string) {
    if (!['APPROVED', 'PENDING', 'SPAM'].includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { status, reported: status === 'APPROVED' ? false : undefined },
    });

    await this.recalculateRating(review.productId);

    return updated;
  }

  private async recalculateRating(productId: string) {
    const [aggregate] = await Promise.all([
      this.prisma.review.aggregate({
        where: { productId, status: 'APPROVED' },
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
