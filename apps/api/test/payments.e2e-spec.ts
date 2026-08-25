import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import { signHmacSha256 } from '../src/common/utils/signature';
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

describe('PaymentsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userToken: string;
  let variantId: string;
  let webhookSecret: string;
  const gatewayOrderId = 'order_test123';

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
    webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET as string;
    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    const password = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'customer@example.com',
        passwordHash: password,
        name: 'Customer',
        role: Role.CUSTOMER,
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'customer@example.com', password: 'password123' });
    userToken = loginRes.body.accessToken;

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

  const sign = (payload: unknown) => {
    const body = JSON.stringify(payload);
    return { body, signature: signHmacSha256(webhookSecret, body) };
  };

  async function checkout(): Promise<string> {
    const res = await request(app.getHttpServer())
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

    if (res.status !== 201) {
      console.error('Checkout error:', res.body);
    }
    expect(res.status).toBe(201);
    return res.body.order.id;
  }

  it('valid signature confirms the order', async () => {
    const orderId = await checkout();

    const payment = await prisma.payment.findFirst({ where: { orderId } });
    expect(payment).toBeDefined();
    expect(payment!.status).toBe('PENDING');

    const payload = {
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: gatewayOrderId,
            entity: 'order',
            amount: 10000,
            status: 'paid',
          },
        },
      },
    };
    const { body, signature } = sign(payload);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true, event: 'order.paid' });

    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment!.id },
    });
    expect(updatedPayment!.status).toBe('COMPLETED');

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    expect(updatedOrder!.status).toBe('PROCESSING');
  });

  it('invalid signature is rejected and leaves state untouched', async () => {
    const orderId = await checkout();

    const payload = {
      event: 'order.paid',
      payload: {
        order: {
          entity: { id: gatewayOrderId, amount: 10000, status: 'paid' },
        },
      },
    };
    const { body } = sign(payload);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalid-signature')
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);

    const payment = await prisma.payment.findFirst({ where: { orderId } });
    expect(payment!.status).toBe('PENDING');

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe('PENDING');
  });

  it('gateway failure event releases the reservation', async () => {
    const orderId = await checkout();
    const payment = await prisma.payment.findFirst({ where: { orderId } });

    const payload = {
      event: 'order.failed',
      payload: {
        order: { entity: { id: gatewayOrderId, status: 'failed' } },
      },
    };
    const { body, signature } = sign(payload);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(body);

    expect(res.status).toBe(200);

    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment!.id },
    });
    expect(updatedPayment!.status).toBe('FAILED');

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    expect(updatedOrder!.status).toBe('CANCELLED');

    const inventory = await prisma.inventory.findUnique({
      where: { variantId },
    });
    expect(inventory!.quantity).toBe(100);
    expect(inventory!.reserved).toBe(0);
  });
});
