import { ReviewsService } from './reviews.service';
import { BadRequestException } from '@nestjs/common';

describe('ReviewsService - Single Review per User/Product Unit Tests', () => {
  let service: ReviewsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn(),
      },
      review: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } }),
      },
    };
    service = new ReviewsService(prismaMock);
  });

  it('updates existing review when user submits a new review for same product', async () => {
    const userId = 'user-1';
    const dto = { productId: 'p-1', rating: 5, title: 'Updated Title', comment: 'Updated Comment' };

    prismaMock.product.findUnique.mockResolvedValue({ id: 'p-1' });
    prismaMock.orderItem.findFirst.mockResolvedValue({ id: 'order-item-1' });
    prismaMock.review.findFirst.mockResolvedValue({ id: 'review-1', userId, productId: 'p-1', rating: 4 });
    prismaMock.review.update.mockResolvedValue({ id: 'review-1', userId, productId: 'p-1', rating: 5, title: dto.title });

    const result = await service.createOrUpdateReview(userId, dto);

    expect(prismaMock.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: { rating: 5, title: dto.title, comment: dto.comment, verifiedPurchase: true },
    });
    expect(prismaMock.review.create).not.toHaveBeenCalled();
    expect(result.rating).toBe(5);
  });

  it('throws BadRequestException if user has not purchased the product', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'p-1' });
    prismaMock.orderItem.findFirst.mockResolvedValue(null);

    await expect(service.createOrUpdateReview('user-1', { productId: 'p-1', rating: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });
});
