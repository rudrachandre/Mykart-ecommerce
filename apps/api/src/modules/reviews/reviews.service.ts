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
      const skip = (p - 1) * l;

      // Find product by id or slug
      const product = await this.prisma.product.findFirst({
        where: {
          OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
        },
        select: { id: true },
      });

      const targetId = product ? product.id : productIdOrSlug;

      const [items, total] = await Promise.all([
        this.prisma.review.findMany({
          where: { productId: targetId },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: l,
        }).catch(() => []),
        this.prisma.review.count({
          where: { productId: targetId },
        }).catch(() => 0),
      ]);

      return {
        items: items || [],
        meta: {
          total: total || 0,
          page: p,
          limit: l,
          totalPages: Math.ceil((total || 0) / l) || 0,
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
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      }).catch(() => [{ _avg: { rating: 0 }, _count: { rating: 0 } }]),
    ]);

    const averageRating = aggregate?._avg?.rating ?? 0;
    const reviewCount = aggregate?._count?.rating ?? 0;

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating,
        reviewCount,
      },
    }).catch(() => null);
  }
}
