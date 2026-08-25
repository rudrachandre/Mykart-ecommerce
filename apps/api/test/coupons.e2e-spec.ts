import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

let mockOrderSeq = 0;

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation(async () => {
        mockOrderSeq += 1;
        return {
          id: `order_coupon_${mockOrderSeq}`,
          amount: 0,
          currency: 'INR',
        };
      }),
    },
  }));
});

describe('Coupon usage limits (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customer1Token: string;
  let customer2Token: string;
  let customer1Id: string;
  let customer2Id: string;
  let productId: string;
  let variantId: string;
  let inventoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    prisma = app.get(PrismaService);

    await app.init();
    await cleanDatabase(prisma);

    const password = await bcrypt.hash('password123', 10);
    const sellerUser = await prisma.user.create({
      data: {
        email: 'coupon-seller@example.com',
        passwordHash: password,
        name: 'Coupon Seller',
        role: Role.SELLER,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'Coupon Store',
        slug: 'coupon-store',
      },
    });

    for (const email of ['coupon-c1@example.com', 'coupon-c2@example.com']) {
      await prisma.user.create({
        data: {
          email,
          passwordHash: password,
          name: email,
          role: Role.CUSTOMER,
        },
      });
    }
    customer1Id = (
      await prisma.user.findUniqueOrThrow({
        where: { email: 'coupon-c1@example.com' },
      })
    ).id;
    customer2Id = (
      await prisma.user.findUniqueOrThrow({
        where: { email: 'coupon-c2@example.com' },
      })
    ).id;

    const category = await prisma.category.create({
      data: { name: 'CouponCat', slug: 'coupon-cat' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Coupon Product',
        slug: 'coupon-product',
        description: 'desc',
        categoryId: category.id,
        sellerId: seller.id,
        status: ProductStatus.ACTIVE,
        basePrice: 50,
        variants: {
          create: [
            {
              sku: 'COUPON-SKU',
              price: 50,
              inventory: { create: { quantity: 100 } },
            },
          ],
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;
    inventoryId = (
      await prisma.inventory.findUniqueOrThrow({ where: { variantId } })
    ).id;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Limit of exactly one redemption.
    await prisma.coupon.create({
      data: {
        code: 'SAVE20',
        type: 'FIXED',
        value: 20,
        startDate: dayAgo,
        expiryDate: in30Days,
        usageLimit: 1,
        active: true,
      },
    });
    // Unlimited redemptions.
    await prisma.coupon.create({
      data: {
        code: 'TENOFF',
        type: 'PERCENTAGE',
        value: 10,
        startDate: dayAgo,
        expiryDate: in30Days,
        active: true,
      },
    });
    // Already fully redeemed.
    await prisma.coupon.create({
      data: {
        code: 'MAXEDOUT',
        type: 'FIXED',
        value: 5,
        startDate: dayAgo,
        expiryDate: in30Days,
        usageLimit: 2,
        usedCount: 2,
        active: true,
      },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' });
      return res.body.accessToken as string;
    };
    customer1Token = await login('coupon-c1@example.com');
    customer2Token = await login('coupon-c2@example.com');
  });

  beforeEach(async () => {
    // Reset transactional state only; base rows persist across tests.
    // Carts are cleared because checkout intentionally does not empty them,
    // and repeated addToCart calls merge quantities on the same variant.
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.coupon.updateMany({ data: { usedCount: 0 } });
    await prisma.coupon.update({
      where: { code: 'MAXEDOUT' },
      data: { usedCount: 2 },
    });
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: 100, reserved: 0 },
    });
  });

  afterAll(async () => {
    try {
      await cleanDatabase(prisma);
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await app.close();
    }
  });

  async function resetCart(token: string) {
    // Checkout intentionally does not empty the cart, and repeated adds merge
    // quantities on the same variant. Clear the caller's own cart so each
    // checkout starts from exactly 2 units (concurrency-safe: per-user scope).
    const res = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`);
    if (!res.ok) return;
    const items: any[] = res.body.items || [];
    for (const item of items) {
      await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`);
    }
  }

  async function addToCart(token: string) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, variantId, quantity: 2 });
    expect(res.status).toBe(201);
  }

  async function checkoutWithCoupon(token: string, couponCode?: string) {
    await resetCart(token);
    await addToCart(token);
    return request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          fullName: 'Cust',
          phone: '1234567890',
          addressLine1: '1 St',
          addressLine2: '',
          city: 'City',
          state: 'ST',
          postalCode: '12345',
          country: 'Testland',
        },
        ...(couponCode ? { couponCode } : {}),
      });
  }

  it('applies the discount and increments usedCount once', async () => {
    const res = await checkoutWithCoupon(customer1Token, 'SAVE20');

    expect(res.status).toBe(201);
    // subtotal 100 - discount 20 + shipping 50 = 130
    expect(Number(res.body.order.discount)).toBe(20);
    expect(Number(res.body.order.shippingFee)).toBe(50);
    expect(Number(res.body.order.total)).toBe(130);

    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { code: 'SAVE20' },
    });
    expect(coupon.usedCount).toBe(1);
  });

  it('rejects redemption beyond usageLimit with 400', async () => {
    const first = await checkoutWithCoupon(customer1Token, 'SAVE20');
    expect(first.status).toBe(201);

    const second = await checkoutWithCoupon(customer1Token, 'SAVE20');
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/usage limit/i);

    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { code: 'SAVE20' },
    });
    expect(coupon.usedCount).toBe(1);

    // A rolled-back checkout must leave the buyer's cart untouched.
    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(cartRes.status).toBe(200);
    expect(cartRes.body.items.length).toBe(1);
    expect(cartRes.body.items[0].quantity).toBe(2);

    // The rejected checkout must not have left an order behind.
    const orderCount = await prisma.order.count({
      where: { userId: customer1Id },
    });
    expect(orderCount).toBe(1);
  });

  it('never exceeds usageLimit under parallel checkouts (limit=1)', async () => {
    const results = await Promise.allSettled([
      checkoutWithCoupon(customer1Token, 'SAVE20'),
      checkoutWithCoupon(customer2Token, 'SAVE20'),
    ]);

    const settled = results.map((r) =>
      r.status === 'fulfilled' ? r.value.status : 0,
    );
    const succeeded = settled.filter((s) => s === 201).length;
    const failed = settled.filter((s) => s !== 201).length;

    expect(succeeded).toBe(1);
    expect(failed).toBe(1);

    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { code: 'SAVE20' },
    });
    expect(coupon.usedCount).toBe(1);

    const totalOrders = await prisma.order.count();
    expect(totalOrders).toBe(1);
  });

  it('allows unlimited reuse when usageLimit is null', async () => {
    const first = await checkoutWithCoupon(customer1Token, 'TENOFF');
    const second = await checkoutWithCoupon(customer1Token, 'TENOFF');

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    // subtotal 100 - 10% + shipping 50 = 140
    expect(Number(first.body.order.total)).toBe(140);
    expect(Number(second.body.order.total)).toBe(140);

    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { code: 'TENOFF' },
    });
    expect(coupon.usedCount).toBe(2);
  });

  it('rejects an already fully-redeemed coupon at checkout', async () => {
    const res = await checkoutWithCoupon(customer1Token, 'MAXEDOUT');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/usage limit/i);

    const orderCount = await prisma.order.count({
      where: { userId: customer1Id },
    });
    expect(orderCount).toBe(0);
  });

  it('validate endpoint still reflects the shared coupon rules', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/coupons/validate?code=TENOFF&orderValue=100')
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.type).toBe('PERCENTAGE');
    expect(res.body.discountAmount).toBe(10);
    expect(res.body.finalValue).toBe(90);
  });

  it('checkout without a coupon is unaffected by redemption logic', async () => {
    const res = await checkoutWithCoupon(customer1Token);

    expect(res.status).toBe(201);
    // subtotal 100 + shipping 50 = 150
    expect(Number(res.body.order.total)).toBe(150);

    const usedCounts = await prisma.coupon.findMany({
      where: { code: { in: ['SAVE20', 'TENOFF'] } },
    });
    // No redemption happened; MAXEDOUT intentionally stays at its seeded count.
    expect(usedCounts.every((c) => c.usedCount === 0)).toBe(true);
  });
});
