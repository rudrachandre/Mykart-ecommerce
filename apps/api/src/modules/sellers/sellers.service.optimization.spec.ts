import { Test, TestingModule } from '@nestjs/testing';
import { SellersService } from './sellers.service';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { OrdersService } from '../orders/orders.service';

describe('SellersService - Seller Dashboard Memory & Performance Optimization (Finding 8)', () => {
  let service: SellersService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      seller: {
        findUnique: jest.fn().mockResolvedValue({ id: 'seller-1', status: 'ACTIVE' }),
      },
      product: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      inventory: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 150 } }),
        count: jest.fn().mockResolvedValue(2),
      },
      orderItem: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      order: {
        count: jest.fn().mockResolvedValue(3),
      },
      productVariant: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AnalyticsService, useValue: { logAction: jest.fn() } },
        { provide: OrdersService, useValue: {} },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
  });

  it('should use aggregate and count queries in getDashboard instead of unbounded findMany', async () => {
    const result = await service.getDashboard('user-1');

    expect(prismaService.inventory.aggregate).toHaveBeenCalledWith({
      where: { variant: { product: { sellerId: 'seller-1' } } },
      _sum: { quantity: true },
    });
    expect(prismaService.inventory.count).toHaveBeenCalledWith({
      where: {
        variant: { product: { sellerId: 'seller-1' } },
        quantity: { lte: 10 },
      },
    });
    expect(prismaService.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sellerId: 'seller-1' },
        select: { price: true, quantity: true },
      }),
    );
    expect(result.kpis.inventoryUnits).toBe(150);
    expect(result.kpis.lowStockCount).toBe(2);
  });

  it('should apply pagination bounds to getSellerProducts', async () => {
    await service.getSellerProducts('user-1', 0, 500); // 500 should be capped to 100

    expect(prismaService.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
  });

  it('should apply pagination bounds to getSellerOrders', async () => {
    await service.getSellerOrders('user-1', 10, 200); // 200 should be capped to 100

    expect(prismaService.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 100,
      }),
    );
  });
});
