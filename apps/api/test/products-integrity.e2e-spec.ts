import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

describe('Product integrity & visibility (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sellerToken: string;
  let categoryId: string;

  const makeProductPayload = (overrides: Record<string, unknown> = {}) => ({
    categoryId: '',
    name: 'Integrity Product',
    slug: `integrity-product-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    description: 'desc',
    basePrice: 100,
    variants: [{ sku: `INT-SKU-${Date.now()}-${Math.floor(Math.random() * 10000)}`, inventory: { quantity: 5 } }],
    ...overrides,
  });

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
    const user = await prisma.user.create({
      data: {
        email: 'integrity-seller@example.com',
        passwordHash: password,
        name: 'Integrity Seller',
        role: Role.SELLER,
      },
    });
    await prisma.seller.create({
      data: { userId: user.id, storeName: 'Integrity Store', slug: 'integrity-store', status: 'ACTIVE' },
    });
    const category = await prisma.category.create({
      data: { name: 'Integrity Cat', slug: 'integrity-cat' },
    });
    categoryId = category.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'integrity-seller@example.com', password: 'password123' });
    sellerToken = login.body.accessToken;
  });

  afterAll(async () => {
    try {
      await cleanDatabase(prisma);
    } finally {
      await app.close();
    }
  });

  it('create with salePrice > basePrice -> 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(makeProductPayload({ categoryId, salePrice: 150 }))
      .expect(400);
    expect(response.body.message).toContain('salePrice');
  });

  it('create with duplicate variant SKU -> 409 (not 500)', async () => {
    const payload = (sku: string) => ({
      categoryId,
      name: 'Dup SKU',
      slug: `dup-sku-product-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      description: 'desc',
      basePrice: 100,
      variants: [{ sku, inventory: { quantity: 1 } }],
    });

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(payload('DUP-SKU-1'))
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(payload('DUP-SKU-1'))
      .expect(409);
    expect(response.body.message).toContain('SKU');
  });

  it('draft product is hidden from the public detail endpoint -> 404', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(makeProductPayload({ categoryId, status: ProductStatus.DRAFT, slug: 'draft-hidden-product' }))
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/products/${created.body.slug}`)
      .expect(404);
  });

  it('active product is publicly visible by slug -> 200', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(makeProductPayload({ categoryId, status: ProductStatus.ACTIVE, slug: 'active-visible-product' }))
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/products/active-visible-product')
      .expect(200);
  });

  it('draft products are excluded from the public listing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/products?limit=100')
      .expect(200);

    const slugs = JSON.stringify(response.body.items.map((p: { slug: string }) => p.slug));
    expect(slugs).not.toContain('draft-hidden-product');
    expect(slugs).toContain('active-visible-product');
  });

  it('seller sees own draft product via seller product list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/sellers/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(JSON.stringify(response.body)).toContain('draft-hidden-product');
  });

  it('update lowering basePrice below existing salePrice -> 400', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(makeProductPayload({ categoryId, salePrice: 80, slug: 'price-guard-product' }))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${created.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ basePrice: 50 })
      .expect(400);
  });

  it('update with valid prices -> 200', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(makeProductPayload({ categoryId, slug: 'price-ok-product' }))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${created.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ salePrice: 90 })
      .expect(200);
  });

  it('update with duplicate variant SKU -> 409 (not 500)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(makeProductPayload({ categoryId, slug: 'dup-update-product' }))
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${created.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ variants: [{ sku: 'DUP-SKU-1', inventory: { quantity: 1 } }] })
      .expect(409);
    expect(response.body.message).toContain('SKU');
  });

  it('customer cannot create products -> 403', async () => {
    const password = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'integrity-customer@example.com',
        passwordHash: password,
        name: 'Integrity Customer',
        role: Role.CUSTOMER,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'integrity-customer@example.com', password: 'password123' });

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send(makeProductPayload({ categoryId }))
      .expect(403);
  });
});
