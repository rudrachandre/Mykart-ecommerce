import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Role } from '@prisma/client';

describe('OrdersService Unit Tests', () => {
  let service: OrdersService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      order: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      cart: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };
    service = new OrdersService(
      prismaMock,
      {} as any, // NotificationsService
      {} as any, // AnalyticsService
      {} as any, // CouponsService
      {} as any, // RedisService
    );
    jest.spyOn(service as any, 'releaseExpiredReservations').mockResolvedValue(undefined);
  });

  describe('getInvoice Authorization', () => {
    it('allows order owner to retrieve their invoice', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1', total: 100 };
      prismaMock.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getInvoice('order-1', 'user-1', Role.CUSTOMER);
      expect(result).toEqual(mockOrder);
      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-1' },
        include: expect.any(Object),
      });
    });

    it('throws ForbiddenException when non-admin/non-support passes no userId', async () => {
      await expect(service.getInvoice('order-1', undefined, Role.CUSTOMER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when order is not found or owned by another user', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.getInvoice('order-1', 'user-2', Role.CUSTOMER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows ADMIN to retrieve invoice without restricting by userId', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1', total: 100 };
      prismaMock.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getInvoice('order-1', undefined, Role.ADMIN);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('checkout Atomic Inventory Reservation', () => {
    it('throws BadRequestException inside transaction if stock is insufficient', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'p-1',
            variantId: 'v-1',
            quantity: 5,
            product: { id: 'p-1', name: 'Prod 1', sellerId: 'seller-1', isPublished: true },
            variant: {
              id: 'v-1',
              basePrice: 100,
              salePrice: null,
              inventory: { quantity: 10, reserved: 0 },
            },
          },
        ],
      };

      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.inventory.updateMany.mockResolvedValue({ count: 0 }); // Out of stock

      const checkoutDto: any = {
        paymentMethod: 'COD',
        shippingAddress: { fullName: 'Test', addressLine1: 'Line 1', city: 'City', state: 'ST', postalCode: '10001', country: 'IN', phone: '9999999999' },
      };

      await expect(service.checkout('user-1', checkoutDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it('creates order and reserves stock atomically inside transaction when stock is available', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'p-1',
            variantId: 'v-1',
            quantity: 2,
            product: { id: 'p-1', name: 'Prod 1', sellerId: 'seller-1', isPublished: true },
            variant: {
              id: 'v-1',
              basePrice: 100,
              salePrice: null,
              inventory: { quantity: 10, reserved: 0 },
            },
          },
        ],
      };

      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.inventory.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.order.create.mockResolvedValue({ id: 'order-123', status: 'PENDING' });
      prismaMock.payment.create.mockResolvedValue({ id: 'pay-123' });
      prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 1 });

      const checkoutDto: any = {
        paymentMethod: 'COD',
        shippingAddress: { fullName: 'Test', addressLine1: 'Line 1', city: 'City', state: 'ST', postalCode: '10001', country: 'IN', phone: '9999999999' },
      };

      const result = await service.checkout('user-1', checkoutDto);

      expect(result.order).toHaveProperty('id', 'order-123');
      expect(prismaMock.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'v-1', quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 }, reserved: { increment: 2 } },
      });
      expect(prismaMock.order.create).toHaveBeenCalled();
    });
  });
});
