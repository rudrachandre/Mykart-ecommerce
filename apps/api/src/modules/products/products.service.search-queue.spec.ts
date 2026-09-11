import { ProductsService } from './products.service';

describe('ProductsService - Search Sync Queue Unit Tests', () => {
  let service: ProductsService;
  let prismaMock: any;
  let queueMock: any;

  beforeEach(() => {
    prismaMock = {
      product: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      seller: {
        findUnique: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
    };
    queueMock = {
      add: jest.fn().mockReturnValue(Promise.resolve()),
    };

    service = new ProductsService(
      prismaMock,
      queueMock, // searchSyncQueue (parameter 2)
      {} as any, // CloudinaryService
      {} as any, // NotificationsService
    );
  });

  it('queues upsert-product job when create succeeds', async () => {
    const sellerId = 'seller-1';
    const dto: any = {
      name: 'Test Prod',
      slug: 'test-prod',
      description: 'Desc',
      basePrice: 100,
      categoryId: 'cat-1',
      variants: [],
    };
    const user = { userId: 'user-1', role: 'SELLER' };
    const createdProd = { id: 'p-1', name: 'Test Prod', slug: 'test-prod', sellerId };

    prismaMock.seller.findUnique.mockResolvedValue({ id: sellerId, userId: 'user-1', status: 'ACTIVE' });
    prismaMock.category.findUnique.mockResolvedValue({ id: 'cat-1' });
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockResolvedValue(createdProd);

    await service.create(dto, user);

    expect(queueMock.add).toHaveBeenCalledWith(
      'upsert-product',
      { productId: 'p-1' },
      expect.any(Object),
    );
  });

  it('queues delete-product job when remove succeeds', async () => {
    const sellerId = 'seller-1';
    const prodId = 'p-1';
    const user = { userId: 'user-1', role: 'ADMIN' };

    prismaMock.product.findUnique.mockResolvedValue({ id: prodId, sellerId });
    prismaMock.product.delete.mockResolvedValue({ id: prodId });

    await service.remove(prodId, user);

    expect(queueMock.add).toHaveBeenCalledWith(
      'delete-product',
      { productId: prodId },
      expect.any(Object),
    );
  });
});
