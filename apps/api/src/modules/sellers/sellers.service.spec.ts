import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SellersService } from './sellers.service';

describe('SellersService - approveReturn Unit Tests', () => {
  let service: SellersService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      seller: {
        findUnique: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
      },
      return: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
      },
      refund: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    service = new SellersService(
      prismaMock,
      {} as any, // AnalyticsService
      {} as any, // OrdersService
    );
  });

  it('restores quantity for delivered order return even when reserved stock is 0', async () => {
    const sellerId = 'seller-1';
    const userId = 'user-1';
    const orderId = 'order-1';
    const returnId = 'return-1';

    prismaMock.seller.findUnique.mockResolvedValue({ id: sellerId, userId, status: 'ACTIVE' });
    prismaMock.orderItem.findMany.mockResolvedValue([{ id: 'item-1', orderId }]);
    prismaMock.return.findFirst.mockResolvedValue({
      id: returnId,
      orderId,
      status: 'REQUESTED',
      reason: 'Defective item',
      order: {
        items: [
          { id: 'item-1', sellerId, variantId: 'v-1', quantity: 2, price: 100 },
        ],
      },
    });
    prismaMock.return.update.mockResolvedValue({ id: returnId, status: 'APPROVED' });
    prismaMock.inventory.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const result = await service.approveReturn(userId, orderId, returnId);

    expect(result).toHaveProperty('status', 'APPROVED');
    // First updateMany increments quantity directly for returned variant
    expect(prismaMock.inventory.updateMany).toHaveBeenNthCalledWith(1, {
      where: { variantId: 'v-1' },
      data: { quantity: { increment: 2 } },
    });
  });

  it('throws BadRequestException if return has already been approved (idempotency)', async () => {
    const sellerId = 'seller-1';
    const userId = 'user-1';
    const orderId = 'order-1';
    const returnId = 'return-1';

    prismaMock.seller.findUnique.mockResolvedValue({ id: sellerId, userId, status: 'ACTIVE' });
    prismaMock.orderItem.findMany.mockResolvedValue([{ id: 'item-1', orderId }]);
    prismaMock.return.findFirst.mockResolvedValue({
      id: returnId,
      orderId,
      status: 'APPROVED',
      order: { items: [] },
    });

    await expect(service.approveReturn(userId, orderId, returnId)).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.inventory.updateMany).not.toHaveBeenCalled();
  });
});
