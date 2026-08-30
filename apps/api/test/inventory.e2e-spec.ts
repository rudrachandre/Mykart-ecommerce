import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus, OrderStatus, PaymentStatus } from '@prisma/client';

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({ id: 'order_test123' }),
    },
  }));
});

describe('InventoryController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sellerToken: string;
  let adminToken: string;
  let sellerId: string;
  let adminId: string;
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
        email: 'inventory-seller@example.com',
        passwordHash: password,
        name: 'Inventory Seller',
        role: Role.SELLER,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'Inventory Store',
        slug: 'inventory-store',
      },
    });
    sellerId = seller.id;

    const adminUser = await prisma.user.create({
      data: {
        email: 'inventory-admin@example.com',
        passwordHash: password,
        name: 'Inventory Admin',
        role: Role.ADMIN,
      },
    });
    adminId = adminUser.id;

    const category = await prisma.category.create({
      data: { name: 'InventoryCat', slug: 'inventory-cat' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Inventory Product',
        slug: 'inventory-product',
        description: 'desc',
        categoryId: category.id,
        sellerId: sellerId,
        status: ProductStatus.ACTIVE,
        basePrice: 50,
        variants: {
          create: [
            {
              sku: 'INV-SKU',
              price: 50,
              inventory: { create: { quantity: 100, reserved: 0, lowStockThreshold: 10 } },
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

    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inventory-seller@example.com', password: 'password123' });
    sellerToken = sellerLoginRes.body.accessToken;

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inventory-admin@example.com', password: 'password123' });
    adminToken = adminLoginRes.body.accessToken;
  });

  beforeEach(async () => {
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventory.updateMany({
      where: { variantId },
      data: { quantity: 100, reserved: 0 },
    });
    await prisma.order.deleteMany({});
    await prisma.payment.deleteMany({});
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

  describe('Stock adjustment', () => {
    it('seller can adjust their own inventory', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/variant/${variantId}/adjust`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ quantity: 50, reason: 'Restock' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.quantity).toBe(150);
      expect(res.body.available).toBe(150);
    });

    it('admin can adjust any inventory', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/variant/${variantId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: -20, reason: 'Damaged goods' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.quantity).toBe(80);
    });

    it('seller cannot adjust another sellers inventory', async () => {
      const otherSeller = await prisma.seller.create({
        data: {
          userId: (await prisma.user.create({
            data: {
              email: 'other-inv-seller@example.com',
              passwordHash: await bcrypt.hash('password123', 10),
              name: 'Other Seller',
              role: Role.SELLER,
            },
          })).id,
          storeName: 'Other Store',
          slug: 'other-store',
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
          basePrice: 50,
          variants: {
            create: [
              {
                sku: 'OTHER-INV-SKU',
                price: 50,
                inventory: { create: { quantity: 100, reserved: 0, lowStockThreshold: 10 } },
              },
            ],
          },
        },
        include: { variants: true },
      });

      const otherVariantId = otherProduct.variants[0].id;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/variant/${otherVariantId}/adjust`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ quantity: 50, reason: 'Restock' });

      expect(res.status).toBe(403);
    });

    it('rejects negative resulting quantity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/variant/${variantId}/adjust`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ quantity: -200, reason: 'Bad adjustment' });

      expect(res.status).toBe(400);
    });
  });

  describe('Transaction history', () => {
    it('returns transaction history for a variant', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/inventory/variant/${variantId}/adjust`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ quantity: 10, reason: 'Restock' });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/variant/${variantId}/transactions`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.transactions).toHaveLength(1);
      expect(res.body.transactions[0].type).toBe('ADJUSTMENT');
      expect(res.body.transactions[0].quantityChange).toBe(10);
    });

    it('seller cannot view another sellers transaction history', async () => {
      const otherSeller = await prisma.seller.create({
        data: {
          userId: (await prisma.user.create({
            data: {
              email: 'other-inv-seller2@example.com',
              passwordHash: await bcrypt.hash('password123', 10),
              name: 'Other Seller 2',
              role: Role.SELLER,
            },
          })).id,
          storeName: 'Other Store 2',
          slug: 'other-store-2',
        },
      });

      const otherProduct = await prisma.product.create({
        data: {
          name: 'Other Product 2',
          slug: 'other-product-2',
          description: 'desc',
          categoryId: (await prisma.category.findFirstOrThrow({})).id,
          sellerId: otherSeller.id,
          status: ProductStatus.ACTIVE,
          basePrice: 50,
          variants: {
            create: [
              {
                sku: 'OTHER-INV-SKU-2',
                price: 50,
                inventory: { create: { quantity: 100, reserved: 0, lowStockThreshold: 10 } },
              },
            ],
          },
        },
        include: { variants: true },
      });

      const otherVariantId = otherProduct.variants[0].id;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/variant/${otherVariantId}/transactions`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Low stock', () => {
    it('returns low stock items based on threshold', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/inventory/variant/${variantId}/adjust`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ quantity: -85, reason: 'Sale' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/low-stock?threshold=20')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items[0].available).toBeLessThanOrEqual(20);
    });

    it('admin can filter low stock by seller', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/low-stock?threshold=20&sellerId=${sellerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
    });
  });

  describe('Security', () => {
    it('customer cannot access inventory endpoints', async () => {
      const customer = await prisma.user.create({
        data: {
          email: 'inventory-customer@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Inventory Customer',
          role: Role.CUSTOMER,
        },
      });

      const customerLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'inventory-customer@example.com', password: 'password123' });
      const customerToken = customerLoginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/variant/${variantId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
