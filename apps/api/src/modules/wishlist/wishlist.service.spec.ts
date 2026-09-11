import { WishlistService } from './wishlist.service';
import { ConflictException } from '@nestjs/common';

describe('WishlistService - Duplicate Unit Tests', () => {
  let service: WishlistService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      wishlist: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      wishlistItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
    };
    service = new WishlistService(prismaMock);
  });

  it('throws ConflictException when adding duplicate product to wishlist', async () => {
    const userId = 'user-1';
    const mockWishlist = { id: 'wishlist-1', userId, items: [] };
    const mockProduct = { id: 'p-1', name: 'Product 1' };
    const mockExistingItem = { id: 'witem-1', wishlistId: 'wishlist-1', productId: 'p-1' };

    prismaMock.wishlist.findUnique.mockResolvedValue(mockWishlist);
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.wishlistItem.findFirst.mockResolvedValue(mockExistingItem);

    await expect(service.addItem(userId, { productId: 'p-1' })).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.wishlistItem.create).not.toHaveBeenCalled();
  });

  it('adds product to wishlist when not already present', async () => {
    const userId = 'user-1';
    const mockWishlist = { id: 'wishlist-1', userId, items: [] };
    const mockProduct = { id: 'p-2', name: 'Product 2' };

    prismaMock.wishlist.findUnique.mockResolvedValue(mockWishlist);
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.wishlistItem.findFirst.mockResolvedValue(null);
    prismaMock.wishlistItem.create.mockResolvedValue({ id: 'witem-2', wishlistId: 'wishlist-1', productId: 'p-2' });

    const result = await service.addItem(userId, { productId: 'p-2' });

    expect(prismaMock.wishlistItem.create).toHaveBeenCalledWith({
      data: { wishlistId: 'wishlist-1', productId: 'p-2' },
    });
    expect(result.id).toBe('witem-2');
  });
});
