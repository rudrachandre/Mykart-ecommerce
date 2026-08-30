import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, OrderStatus, PaymentStatus, ProductStatus } from '@prisma/client';

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({ id: 'order_test123' }),
    },
  }));
});

describe('Order Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let customerId: string;
  let sellerId: string;
  let adminId: string;
  let productId: string;
  let variantId: string;
  let orderId: string;

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

    const customer = await prisma.user.create({
      data: {
        email: 'lifecycle-customer@example.com',
        passwordHash: password,
        name: 'Lifecycle Customer',
        role: Role.CUSTOMER,
        addresses: {
          create: [
            {
              fullName: 'Lifecycle Customer',
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
    customerId = customer.id;

    const sellerUser = await prisma.user.create({
      data: {
        email: 'lifecycle-seller@example.com',
        passwordHash: password,
        name: 'Lifecycle Seller',
        role: Role.SELLER,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'Lifecycle Store',
        slug: 'lifecycle-store',
      },
    });
    sellerId = seller.id;

    const adminUser = await prisma.user.create({
      data: {
        email: 'lifecycle-admin@example.com',
        passwordHash: password,
        name: 'Lifecycle Admin',
        role: Role.ADMIN,
      },
    });
    adminId = adminUser.id;

    const category = await prisma.category.create({
      data: { name: 'LifecycleCat', slug: 'lifecycle-cat' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Lifecycle Product',
        slug: 'lifecycle-product',
        description: 'desc',
        categoryId: category.id,
        sellerId: sellerId,
        status: ProductStatus.ACTIVE,
        basePrice: 100,
        variants: {
          create: [
            {
              sku: 'LIFE-SKU',
              price: 100,
              inventory: { create: { quantity: 100 } },
            },
          ],
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle-customer@example.com', password: 'password123' });
    customerToken = loginRes.body.accessToken;

    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle-seller@example.com', password: 'password123' });
    sellerToken = sellerLoginRes.body.accessToken;

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle-admin@example.com', password: 'password123' });
    adminToken = adminLoginRes.body.accessToken;
  });

  beforeEach(async () => {
    await prisma.order.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.inventory.update({
      where: { variantId },
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

  async function seedOrder(status: OrderStatus = OrderStatus.PENDING, paymentStatus: PaymentStatus = PaymentStatus.PENDING): Promise<string> {
    const newOrderId = `order-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdOrder = await prisma.order.create({
      data: {
        id: newOrderId,
        userId: customerId,
        status,
        subtotal: 200,
        discount: 0,
        shippingFee: 50,
        tax: 36,
        total: 286,
        shippingAddress: {
          fullName: 'Lifecycle Customer',
          phone: '1234567890',
          addressLine1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Testland',
        },
        items: {
          create: [
            {
              productId,
              sellerId,
              variantId,
              quantity: 2,
              price: 100,
            },
          ],
        },
      },
      include: { items: true },
    });

    const orderItemId = createdOrder.items[0].id;

    if (paymentStatus !== PaymentStatus.PENDING) {
      await prisma.payment.create({
        data: {
          orderId: newOrderId,
          provider: 'RAZORPAY',
          amount: 286,
          currency: 'INR',
          status: paymentStatus,
          transactionId: `txn_${Date.now()}`,
        },
      });
    }

    return newOrderId;
  }

  describe('Customer', () => {
    it('can cancel a pending order', async () => {
      orderId = await seedOrder(OrderStatus.PENDING);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed mind' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('cannot cancel a delivered order', async () => {
      orderId = await seedOrder(OrderStatus.DELIVERED, PaymentStatus.COMPLETED);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
    });

    it('cannot cancel another customer order', async () => {
      orderId = await seedOrder(OrderStatus.PENDING);
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-customer@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Other',
          role: Role.CUSTOMER,
        },
      });
      const otherLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'other-customer@example.com', password: 'password123' });
      const otherToken = otherLogin.body.accessToken;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('can request a return for a delivered order', async () => {
      orderId = await seedOrder(OrderStatus.DELIVERED, PaymentStatus.COMPLETED);
      const items = await prisma.orderItem.findMany({ where: { orderId } });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/return`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Defective product',
          items: [{ orderItemId: items[0].id, quantity: 1, reason: 'Broken' }],
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('REQUESTED');
    });

    it('cannot return a pending order', async () => {
      orderId = await seedOrder(OrderStatus.PENDING);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/return`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed mind', items: [] });

      expect(res.status).toBe(400);
    });

    it('can request a replacement for a delivered order', async () => {
      orderId = await seedOrder(OrderStatus.DELIVERED, PaymentStatus.COMPLETED);
      const items = await prisma.orderItem.findMany({ where: { orderId } });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/replacement`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Wrong size',
          items: [{ orderItemId: items[0].id, quantity: 1, reason: 'Size mismatch' }],
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('REQUESTED');
    });

    it('can view invoice', async () => {
      orderId = await seedOrder(OrderStatus.PROCESSING);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/invoice`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
    });
  });

  describe('Seller', () => {
    it('can view order detail for their order', async () => {
      orderId = await seedOrder(OrderStatus.PROCESSING);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/sellers/orders/${orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
    });

    it('cannot view order detail for another seller order', async () => {
      const otherSeller = await prisma.seller.create({
        data: {
          userId: (await prisma.user.create({
            data: {
              email: 'other-seller2@example.com',
              passwordHash: await bcrypt.hash('password123', 10),
              name: 'Other Seller',
              role: Role.SELLER,
            },
          })).id,
          storeName: 'Other Store 2',
          slug: 'other-store-2',
        },
      });

      const otherProduct = await prisma.product.create({
        data: {
          name: 'Other Product',
          slug: 'other-product',
          description: 'desc',
          categoryId: (await prisma.category.findFirstOrThrow({})).id,
          sellerId: otherSeller.id,
          status: ProductStatus.ACTIVE,
          basePrice: 100,
          variants: {
            create: [
              {
                sku: 'OTHER-SKU',
                price: 100,
                inventory: { create: { quantity: 100 } },
              },
            ],
          },
        },
        include: { variants: true },
      });

      const otherOrderId = `order-other-${Date.now()}`;
      await prisma.order.create({
        data: {
          id: otherOrderId,
          userId: customerId,
          status: OrderStatus.PROCESSING,
          subtotal: 100,
          discount: 0,
          shippingFee: 50,
          tax: 18,
          total: 168,
          shippingAddress: {
            fullName: 'Customer',
            phone: '1234567890',
            addressLine1: '123 Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'Testland',
          },
          items: {
            create: [
              {
                productId: otherProduct.id,
                sellerId: otherSeller.id,
                variantId: otherProduct.variants[0].id,
                quantity: 1,
                price: 100,
              },
            ],
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/sellers/orders/${otherOrderId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(404);
    });

    it('can approve a return request', async () => {
      orderId = await seedOrder(OrderStatus.DELIVERED, PaymentStatus.COMPLETED);
      const returnRes = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/return`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Defective', items: [] });
      const returnId = returnRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/sellers/orders/${orderId}/returns/${returnId}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('APPROVED');
    });
  });

  describe('Admin', () => {
    it('can view any order detail', async () => {
      orderId = await seedOrder(OrderStatus.PROCESSING);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
    });

    it('can process a refund', async () => {
      orderId = await seedOrder(OrderStatus.DELIVERED, PaymentStatus.COMPLETED);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 286, reason: 'Customer request' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('PENDING');
    });
  });
});
