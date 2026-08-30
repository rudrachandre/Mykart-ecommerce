import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: jest.fn().mockResolvedValue({ id: 'order_test123' }),
      },
    };
  });
});

describe('OrdersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let addressId: string;
  let variantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Seed User
    const password = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'customer@example.com',
        passwordHash: password,
        name: 'Customer',
        role: Role.CUSTOMER,
        addresses: {
          create: [
            {
              fullName: 'Customer',
              phone: '1234567890',
              addressLine1: '123 Test St',
              city: 'Test City',
              state: 'TS',
              postalCode: '12345',
              country: 'Testland',
            },
          ],
        },
      },
      include: { addresses: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const addressId = user.addresses[0].id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'customer@example.com', password: 'password123' });
    userToken = loginRes.body.accessToken;

    // Seed Product & Variant
    const category = await prisma.category.create({
      data: { name: 'Test', slug: 'test' },
    });
    const seller = await prisma.seller.create({
      data: {
        storeName: 'Store',
        slug: 'store',
        user: {
          create: {
            email: 's@s.com',
            passwordHash: '123',
            name: 'S',
            role: Role.SELLER,
          },
        },
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Product 1',
        slug: 'p1',
        description: 'desc',
        categoryId: category.id,
        sellerId: seller.id,
        status: ProductStatus.ACTIVE,
        basePrice: 50,
        variants: {
          create: [
            {
              sku: 'SKU1',
              price: 50,
              inventory: { create: { quantity: 100 } },
            },
          ],
        },
      },
      include: { variants: true },
    });
    variantId = product.variants[0].id;

    // Add to cart
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, variantId, quantity: 2 });
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

  it('/api/v1/orders/checkout (POST) - should create an order from cart', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        shippingAddress: {
          fullName: 'Test User',
          phone: '1234567890',
          addressLine1: '123 Test St',
          addressLine2: '',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Test Country',
        },
      });

    if (response.status !== 201) {
      console.error('Orders error:', response.body);
    }

    expect(response.status).toBe(201);

    expect(response.body.order).toHaveProperty('id');

    // Server-authoritative shipping rule: subtotal 100 (2 x 50) is below the
    // 10,000 threshold, so the flat 50 fee applies.
    // Tax is 18% of subtotal (100) = 18.
    expect(Number(response.body.order.subtotal)).toBe(100);
    expect(Number(response.body.order.shippingFee)).toBe(50);
    expect(Number(response.body.order.tax)).toBe(18);
    expect(Number(response.body.order.total)).toBe(168);
    expect(response.body.order.status).toBe('PENDING');

    const cartAfter = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(cartAfter.status).toBe(200);
    expect(cartAfter.body.items.length).toBe(0);
  });

  it('/api/v1/orders/checkout (POST) - keeps the cart when checkout fails', async () => {
    // Force an insufficient-stock failure before any reservation happens.
    await prisma.inventory.update({
      where: { variantId },
      data: { quantity: 0, reserved: 0 },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        shippingAddress: {
          fullName: 'Test User',
          phone: '1234567890',
          addressLine1: '123 Test St',
          addressLine2: '',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Test Country',
        },
      });

    expect(response.status).toBe(400);

    const cart = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(cart.status).toBe(200);
    expect(cart.body.items.length).toBe(1);
    expect(cart.body.items[0].quantity).toBe(2);
  });
});
