import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { mockPrismaService } from '../../mocks/prisma.service.mock';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getInventoryByVariantId', () => {
    it('should return inventory for a valid variant', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        quantity: 100,
        reserved: 5,
        updatedAt: new Date(),
        variant: {
          id: 'var-1',
          sku: 'SKU-1',
          color: 'Red',
          size: 'M',
          product: { id: 'prod-1', name: 'Product 1', sellerId: 'seller-1' },
        },
      });
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      const result = await service.getInventoryByVariantId('var-1', {
        userId: 'user-1',
        role: 'SELLER',
      });
      expect(result.quantity).toBe(100);
      expect(result.available).toBe(95);
    });

    it('should throw NotFoundException for missing inventory', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);
      await expect(
        service.getInventoryByVariantId('var-1', {
          userId: 'user-1',
          role: 'SELLER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to access any inventory', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        quantity: 100,
        reserved: 0,
        updatedAt: new Date(),
        variant: {
          id: 'var-1',
          sku: 'SKU-1',
          color: 'Red',
          size: 'M',
          product: {
            id: 'prod-1',
            name: 'Product 1',
            sellerId: 'other-seller',
          },
        },
      });

      const result = await service.getInventoryByVariantId('var-1', {
        userId: 'admin-1',
        role: 'ADMIN',
      });
      expect(result.quantity).toBe(100);
    });

    it('should block seller from accessing another sellers inventory', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        quantity: 100,
        reserved: 0,
        updatedAt: new Date(),
        variant: {
          id: 'var-1',
          sku: 'SKU-1',
          color: 'Red',
          size: 'M',
          product: {
            id: 'prod-1',
            name: 'Product 1',
            sellerId: 'other-seller',
          },
        },
      });
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      await expect(
        service.getInventoryByVariantId('var-1', {
          userId: 'user-1',
          role: 'SELLER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        product: { id: 'prod-1', sellerId: 'seller-1' },
        inventory: { id: 'inv-1', quantity: 50, reserved: 5 },
      });
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        quantity: 100,
        reserved: 5,
        updatedAt: new Date(),
      });

      const result = await service.updateStock(
        'var-1',
        { userId: 'user-1', role: 'SELLER' },
        100,
      );
      expect(result.quantity).toBe(100);
      expect(result.available).toBe(95);
    });

    it('should reject negative quantity', async () => {
      await expect(
        service.updateStock('var-1', { userId: 'user-1', role: 'SELLER' }, -1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject quantity below reserved', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        product: { id: 'prod-1', sellerId: 'seller-1' },
        inventory: { id: 'inv-1', quantity: 50, reserved: 10 },
      });
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      await expect(
        service.updateStock('var-1', { userId: 'user-1', role: 'SELLER' }, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to update any inventory', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        product: { id: 'prod-1', sellerId: 'other-seller' },
        inventory: { id: 'inv-1', quantity: 50, reserved: 0 },
      });
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        quantity: 100,
        reserved: 0,
        updatedAt: new Date(),
      });

      const result = await service.updateStock(
        'var-1',
        { userId: 'admin-1', role: 'ADMIN' },
        100,
      );
      expect(result.quantity).toBe(100);
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items for seller', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          variantId: 'var-1',
          quantity: 10,
          reserved: 8,
          updatedAt: new Date(),
          variant: {
            id: 'var-1',
            sku: 'SKU-1',
            product: { id: 'prod-1', name: 'Product 1', sellerId: 'seller-1' },
          },
        },
      ]);
      prisma.inventory.count.mockResolvedValue(1);
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      const result = await service.getLowStockItems(
        { userId: 'user-1', role: 'SELLER' },
        10,
        1,
        20,
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.available).toBe(2);
    });

    it('should filter by sellerId for admin', async () => {
      prisma.inventory.findMany.mockResolvedValue([]);
      prisma.inventory.count.mockResolvedValue(0);
      prisma.seller.findUnique.mockResolvedValue({ id: 'seller-1' });

      const result = await service.getLowStockItems(
        { userId: 'admin-1', role: 'ADMIN' },
        10,
        1,
        20,
        'seller-1',
      );
      expect(result.items).toHaveLength(0);
    });

    it('should throw NotFoundException for invalid sellerId', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);

      await expect(
        service.getLowStockItems(
          { userId: 'admin-1', role: 'ADMIN' },
          10,
          1,
          20,
          'invalid-seller',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpdateStock', () => {
    it('should update multiple variants in a transaction', async () => {
      prisma.productVariant.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve({
          id: where.id,
          productId: where.id === 'var-1' ? 'prod-1' : 'prod-2',
          product: { id: where.id === 'var-1' ? 'prod-1' : 'prod-2', sellerId: 'seller-1' },
          inventory: {
            id: where.id === 'var-1' ? 'inv-1' : 'inv-2',
            quantity: where.id === 'var-1' ? 50 : 30,
            reserved: where.id === 'var-1' ? 5 : 2,
          },
        }),
      );
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: 'var-1',
          productId: 'prod-1',
          product: { id: 'prod-1', sellerId: 'seller-1' },
          inventory: { id: 'inv-1', quantity: 50, reserved: 5 },
        },
        {
          id: 'var-2',
          productId: 'prod-2',
          product: { id: 'prod-2', sellerId: 'seller-1' },
          inventory: { id: 'inv-2', quantity: 30, reserved: 2 },
        },
      ]);
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });
      prisma.inventory.update.mockImplementation(
        ({ where, data, include }: { where: any; data: any; include?: any }) =>
          Promise.resolve({
            id: where.variantId === 'var-1' ? 'inv-1' : 'inv-2',
            variantId: where.variantId,
            quantity: data.quantity,
            reserved: where.variantId === 'var-1' ? 5 : 2,
            updatedAt: new Date(),
            ...(include?.variant && {
              variant: {
                id: where.variantId === 'var-1' ? 'var-1' : 'var-2',
                sku: where.variantId === 'var-1' ? 'SKU-1' : 'SKU-2',
                color: 'Red',
                size: 'M',
                product: {
                  id: where.variantId === 'var-1' ? 'prod-1' : 'prod-2',
                  name: where.variantId === 'var-1' ? 'Product 1' : 'Product 2',
                  sellerId: 'seller-1',
                },
              },
            }),
          }),
      );

      const result = await service.bulkUpdateStock(
        [
          { variantId: 'var-1', quantity: 100 },
          { variantId: 'var-2', quantity: 50 },
        ],
        { userId: 'user-1', role: 'SELLER' },
      );

      expect(result).toHaveLength(2);
      expect(result[0].quantity).toBe(100);
      expect(result[1].quantity).toBe(50);
    });

    it('should reject if any update has negative quantity', async () => {
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: 'var-1',
          productId: 'prod-1',
          product: { id: 'prod-1', sellerId: 'seller-1' },
          inventory: { id: 'inv-1', quantity: 50, reserved: 5 },
        },
      ]);
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      await expect(
        service.bulkUpdateStock([{ variantId: 'var-1', quantity: -1 }], {
          userId: 'user-1',
          role: 'SELLER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if seller does not own a variant', async () => {
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: 'var-1',
          productId: 'prod-1',
          product: { id: 'prod-1', sellerId: 'other-seller' },
          inventory: { id: 'inv-1', quantity: 50, reserved: 0 },
        },
      ]);
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      await expect(
        service.bulkUpdateStock([{ variantId: 'var-1', quantity: 100 }], {
          userId: 'user-1',
          role: 'SELLER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject empty updates array', async () => {
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
      });

      await expect(
        service.bulkUpdateStock([], { userId: 'user-1', role: 'SELLER' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
