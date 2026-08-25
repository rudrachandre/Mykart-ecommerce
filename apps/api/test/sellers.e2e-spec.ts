import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Role,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';

describe('SellersController — order status security (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sellerToken: string;
  let sellerId: string;
  let otherSellerId: string;
  let customerId: string;
  let productId: string;
  let variantId: string;
  let inventoryId: string;

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

    await cleanDatabase(prisma);

    const password = await bcrypt.hash('password123', 10);

    const sellerUser = await prisma.user.create({
      data: {
        email: 'status-seller@example.com',
        passwordHash: password,
        name: 'Status Seller',
        role: Role.SELLER,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'Status Store',
        slug: 'status-store',
      },
    });
    sellerId = seller.id;

    const otherSellerUser = await prisma.user.create({
      data: {
        email: 'other-seller@example.com',
        passwordHash: password,
        name: 'Other Seller',
        role: Role.SELLER,
      },
    });
    const otherSeller = await prisma.seller.create({
      data: {
        userId: otherSellerUser.id,
        storeName: 'Other Store',
        slug: 'other-store',
      },
    });
    otherSellerId = otherSeller.id;

    const customer = await prisma.user.create({
      data: {
        email: 'status-customer@example.com',
        passwordHash: password,
        name: 'Status Customer',
        role: Role.CUSTOMER,
      },
    });
    customerId = customer.id;

    const category = await prisma.category.create({
      data: { name: 'StatusCat', slug: 'status-cat' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Status Product',
        slug: 'status-product',
        description: 'desc',
        categoryId: category.id,
        sellerId: sellerId,
        status: ProductStatus.ACTIVE,
        basePrice: 50,
        variants: {
          create: [
            {
              sku: 'STATUS-SKU',
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

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'status-seller@example.com', password: 'password123' });
    sellerToken = loginRes.body.accessToken;
  });

  beforeEach(async () => {
    // Reset only transactional data; users/sellers/product persist from beforeAll.
    await prisma.order.deleteMany({});
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

  async function seedOrder(
    status: OrderStatus,
    ownerSellerId: string,
    paymentStatus?: PaymentStatus,
  ): Promise<string> {
    const orderId = crypto.randomUUID();
    await prisma.order.create({
      data: {
        id: orderId,
        userId: customerId,
        status,
        subtotal: 100,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 100,
        shippingAddress: {
          fullName: 'Cust',
          phone: '1234567890',
          addressLine1: '1 St',
          city: 'City',
          state: 'ST',
          postalCode: '12345',
          country: 'Testland',
        },
        items: {
          create: [
            {
              productId,
              sellerId: ownerSellerId,
              variantId,
              quantity: 2,
              price: 50,
            },
          ],
        },
      },
    });

    if (paymentStatus) {
      await prisma.payment.create({
        data: {
          orderId,
          provider: 'RAZORPAY',
          amount: 100,
          currency: 'INR',
          status: paymentStatus,
          transactionId: 'order_seed_' + crypto.randomUUID().slice(0, 8),
        },
      });
    }

    return orderId;
  }

  function putStatus(orderId: string, status: string) {
    return request(app.getHttpServer())
      .put(`/api/v1/sellers/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status });
  }

  it('rejects invalid status values with 400', async () => {
    const orderId = await seedOrder(
      OrderStatus.PENDING,
      sellerId,
      PaymentStatus.PENDING,
    );

    const res = await putStatus(orderId, 'NOT_A_REAL_STATUS');

    expect(res.status).toBe(400);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('rejects illegal state transitions with 400', async () => {
    const orderId = await seedOrder(
      OrderStatus.SHIPPED,
      sellerId,
      PaymentStatus.COMPLETED,
    );

    const res = await putStatus(orderId, 'PENDING');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/illegal status transition/i);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe(OrderStatus.SHIPPED);
  });

  it('treats terminal states as non-transitionable with 400', async () => {
    const deliveredId = await seedOrder(
      OrderStatus.DELIVERED,
      sellerId,
      PaymentStatus.COMPLETED,
    );
    const resDelivered = await putStatus(deliveredId, 'SHIPPED');
    expect(resDelivered.status).toBe(400);
  });

  it('allows the valid PROCESSING -> SHIPPED transition with 200', async () => {
    const orderId = await seedOrder(
      OrderStatus.PROCESSING,
      sellerId,
      PaymentStatus.COMPLETED,
    );

    const res = await putStatus(orderId, 'SHIPPED');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(OrderStatus.SHIPPED);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe(OrderStatus.SHIPPED);
  });

  it('returns 404 when the order contains none of the seller items', async () => {
    const orderId = await seedOrder(
      OrderStatus.PROCESSING,
      otherSellerId,
      PaymentStatus.COMPLETED,
    );

    const res = await putStatus(orderId, 'SHIPPED');

    expect(res.status).toBe(404);
  });

  it('routes unpaid cancellation through the Module 13 reservation release', async () => {
    const orderId = await seedOrder(
      OrderStatus.PENDING,
      sellerId,
      PaymentStatus.PENDING,
    );

    // Simulate checkout-time reservation of 2 units.
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: 98, reserved: 2 },
    });

    const res = await putStatus(orderId, 'CANCELLED');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(OrderStatus.CANCELLED);

    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId },
    });
    expect(payment.status).toBe(PaymentStatus.FAILED);

    // Stock restored exactly once via releaseOrderReservation().
    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inventory.quantity).toBe(100);
    expect(inventory.reserved).toBe(0);
  });

  it('rejects cancelling a paid (PROCESSING) order with 400', async () => {
    const orderId = await seedOrder(
      OrderStatus.PROCESSING,
      sellerId,
      PaymentStatus.COMPLETED,
    );

    const res = await putStatus(orderId, 'CANCELLED');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/illegal status transition/i);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe(OrderStatus.PROCESSING);
  });
});
