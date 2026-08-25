import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

describe('Admin moderation & products (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let sellerToken: string;
  let customerToken: string;
  let sellerUserId: string;
  let sellerId: string;
  let customerId: string;
  let productId: string;

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

    const adminUser = await prisma.user.create({
      data: {
        email: 'mod-admin@example.com',
        passwordHash: password,
        name: 'Moderator',
        role: Role.ADMIN,
      },
    });

    const sUser = await prisma.user.create({
      data: {
        email: 'mod-seller@example.com',
        passwordHash: password,
        name: 'Mod Seller',
        role: Role.SELLER,
      },
    });
    sellerUserId = sUser.id;
    const seller = await prisma.seller.create({
      data: {
        userId: sUser.id,
        storeName: 'Mod Store',
        slug: 'mod-store',
        status: 'ACTIVE',
      },
    });
    sellerId = seller.id;

    const cUser = await prisma.user.create({
      data: {
        email: 'mod-customer@example.com',
        passwordHash: password,
        name: 'Mod Customer',
        role: Role.CUSTOMER,
      },
    });
    customerId = cUser.id;

    const category = await prisma.category.create({
      data: { name: 'ModCat', slug: 'mod-cat' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Moderated Product',
        slug: 'moderated-product',
        description: 'desc',
        categoryId: category.id,
        sellerId: seller.id,
        status: ProductStatus.ACTIVE,
        basePrice: 75,
        variants: {
          create: [
            {
              sku: 'MOD-SKU',
              price: 75,
              inventory: { create: { quantity: 10 } },
            },
          ],
        },
      },
    });
    productId = product.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' });
      return res.body.accessToken as string;
    };
    adminToken = await login('mod-admin@example.com');
    sellerToken = await login('mod-seller@example.com');
    customerToken = await login('mod-customer@example.com');
  });

  beforeEach(async () => {
    // Reset moderation targets and audit trail between tests.
    await prisma.auditLog.deleteMany({});
    await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ACTIVE },
    });
    await prisma.seller.update({
      where: { id: sellerId },
      data: { status: 'ACTIVE' },
    });
    await prisma.user.update({
      where: { id: customerId },
      data: { role: Role.CUSTOMER },
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

  it('GET /admin/products returns { products, total } for ADMIN', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/products?skip=0&take=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    const found = res.body.products.find((p: any) => p.id === productId);
    expect(found).toBeDefined();
    expect(found.seller.storeName).toBe('Mod Store');
    expect(found.category.name).toBe('ModCat');
  });

  it('GET /admin/products supports search filtering', async () => {
    const hit = await request(app.getHttpServer())
      .get('/api/v1/admin/products?search=Moderated')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(hit.status).toBe(200);
    expect(hit.body.total).toBe(1);

    const miss = await request(app.getHttpServer())
      .get('/api/v1/admin/products?search=does-not-exist-xyz')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(miss.status).toBe(200);
    expect(miss.body.total).toBe(0);
  });

  it('GET /admin/products is forbidden for SELLER and CUSTOMER', async () => {
    const asSeller = await request(app.getHttpServer())
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(asSeller.status).toBe(403);

    const asCustomer = await request(app.getHttpServer())
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(asCustomer.status).toBe(403);
  });

  it('PATCH /admin/users/:id/role changes the role and writes an audit log', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SELLER' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('SELLER');

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: customerId },
    });
    expect(dbUser.role).toBe(Role.SELLER);

    const logs = await prisma.auditLog.findMany({
      where: { action: 'USER_ROLE_CHANGED', entityId: customerId },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].details).toMatchObject({ from: 'CUSTOMER', to: 'SELLER' });
  });

  it('PATCH /admin/users/:id/role rejects invalid roles with 400 and forbids non-admins', async () => {
    const invalid = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SUPERADMIN' });
    expect(invalid.status).toBe(400);

    const asSeller = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ role: 'ADMIN' });
    expect(asSeller.status).toBe(403);

    const asCustomer = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ role: 'ADMIN' });
    expect(asCustomer.status).toBe(403);
  });

  it('PATCH /admin/sellers/:id/status suspends and blocks seller operations', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/sellers/${sellerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUSPENDED');

    // Seller self-service endpoints are blocked while suspended.
    const profile = await request(app.getHttpServer())
      .get('/api/v1/sellers/profile')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(profile.status).toBe(403);
    expect(profile.body.message).toMatch(/suspended/i);

    // Seller-owned product creation is blocked too (ProductsService choke point).
    const categoryId = (
      await prisma.category.findFirstOrThrow({ where: { slug: 'mod-cat' } })
    ).id;
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Blocked Product',
        slug: 'blocked-product',
        description: 'x',
        basePrice: 10,
        categoryId,
        variants: [
          { sku: 'BLOCKED-SKU', price: 10, inventory: { quantity: 1 } },
        ],
      });
    expect(createRes.status).toBe(403);
    expect(createRes.body.message).toMatch(/suspended/i);

    const logs = await prisma.auditLog.findMany({
      where: { action: 'SELLER_STATUS_CHANGED', entityId: sellerId },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].details).toMatchObject({ from: 'ACTIVE', to: 'SUSPENDED' });
  });

  it('PATCH /admin/sellers/:id/status reactivates a suspended seller', async () => {
    await prisma.seller.update({
      where: { id: sellerId },
      data: { status: 'SUSPENDED' },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/sellers/${sellerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');

    const profile = await request(app.getHttpServer())
      .get('/api/v1/sellers/profile')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(profile.status).toBe(200);
  });

  it('PATCH /admin/sellers/:id/status rejects invalid values with 400 and forbids non-admins', async () => {
    const invalid = await request(app.getHttpServer())
      .patch(`/api/v1/admin/sellers/${sellerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'BANNED' });
    expect(invalid.status).toBe(400);

    const asCustomer = await request(app.getHttpServer())
      .patch(`/api/v1/admin/sellers/${sellerId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'SUSPENDED' });
    expect(asCustomer.status).toBe(403);
  });

  it('PATCH /admin/products/:id/status archives and restores with audit trail', async () => {
    const archive = await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ARCHIVED' });
    expect(archive.status).toBe(200);
    expect(archive.body.status).toBe('ARCHIVED');

    let dbProduct = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(dbProduct.status).toBe(ProductStatus.ARCHIVED);

    const restore = await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(restore.status).toBe(200);

    dbProduct = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(dbProduct.status).toBe(ProductStatus.ACTIVE);

    const logs = await prisma.auditLog.findMany({
      where: { action: 'PRODUCT_STATUS_CHANGED', entityId: productId },
    });
    expect(logs.length).toBe(2);
    const transitions = logs.map((l) => (l.details as any)?.to);
    expect(transitions).toContain('ARCHIVED');
    expect(transitions).toContain('ACTIVE');
  });

  it('PATCH /admin/products/:id/status rejects invalid values with 400 and forbids non-admins', async () => {
    const invalid = await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LIVE' });
    expect(invalid.status).toBe(400);

    const asSeller = await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'ARCHIVED' });
    expect(asSeller.status).toBe(403);
  });

  it('POST /sellers/onboard requires authentication (401 unauthenticated)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sellers/onboard')
      .send({ storeName: 'No Auth Store' });
    expect(res.status).toBe(401);
  });
});
