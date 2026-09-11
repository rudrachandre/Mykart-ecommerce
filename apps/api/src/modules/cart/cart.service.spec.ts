import { CartService } from './cart.service';
import { BadRequestException } from '@nestjs/common';

describe('CartService - Duplicate & Quantity Unit Tests', () => {
  let service: CartService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
      },
    };
    service = new CartService(prismaMock);
  });

  it('updates quantity of existing item when adding same variant instead of creating duplicate', async () => {
    const userId = 'user-1';
    const mockCart = { id: 'cart-1', userId, items: [] };
    const mockVariant = { id: 'v-1', productId: 'p-1', price: 100, inventory: { quantity: 10 } };
    const mockProduct = { id: 'p-1', basePrice: 100 };
    const mockExistingItem = { id: 'item-1', cartId: 'cart-1', productId: 'p-1', variantId: 'v-1', quantity: 2 };

    prismaMock.cart.findUnique.mockResolvedValue(mockCart);
    prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant);
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.cartItem.findFirst.mockResolvedValue(mockExistingItem);
    prismaMock.cartItem.update.mockResolvedValue({ ...mockExistingItem, quantity: 3 });

    const result = await service.addItem(userId, { productId: 'p-1', variantId: 'v-1', quantity: 1 });

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantity: 3 },
    });
    expect(prismaMock.cartItem.create).not.toHaveBeenCalled();
    expect(result.quantity).toBe(3);
  });

  it('creates new cart item for a different variant', async () => {
    const userId = 'user-1';
    const mockCart = { id: 'cart-1', userId, items: [] };
    const mockVariant = { id: 'v-2', productId: 'p-1', price: 100, inventory: { quantity: 10 } };
    const mockProduct = { id: 'p-1', basePrice: 100 };

    prismaMock.cart.findUnique.mockResolvedValue(mockCart);
    prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant);
    prismaMock.product.findUnique.mockResolvedValue(mockProduct);
    prismaMock.cartItem.findFirst.mockResolvedValue(null);
    prismaMock.cartItem.create.mockResolvedValue({ id: 'item-2', cartId: 'cart-1', productId: 'p-1', variantId: 'v-2', quantity: 1, price: 100 });

    const result = await service.addItem(userId, { productId: 'p-1', variantId: 'v-2', quantity: 1 });

    expect(prismaMock.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: 'cart-1', productId: 'p-1', variantId: 'v-2', quantity: 1, price: 100 },
    });
    expect(result.id).toBe('item-2');
  });
});
