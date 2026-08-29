import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

describe('Product discovery & safe public exposure (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sellerId: string;

  const makeCategory = async (slug: string) =>
    prisma.category.create({ data: { name: slug, slug } });

  const makeProduct = async (data: {
    categoryId: string;
    slug: string;
    status: ProductStatus;
  }) =>
    prisma.product.create({
      data: {
        name: data.slug.replace(/-/g, ' '),
        slug: data.slug,
        description: 'desc',
        categoryId: data.categoryId,
        sellerId,
        status: data.status,
        basePrice: 100,
        salePrice: data.status === ProductStatus.ACTIVE ? 80 : undefined,
        variants: {
          create: [
            {
              sku: data.slug.toUpperCase(),
              price: 80,
              inventory: { create: { quantity: 50, reserved: 0 } },
            },
          ],
        },
      },
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    prisma = app.get(PrismaService);

    await app.init();
    await cleanDatabase(prisma);

    const password = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'disc-seller@example.com',
        passwordHash: password,
        name: 'Discovery Seller',
        role: Role.SELLER,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        storeName: 'Discovery Store',
        slug: 'discovery-store',
        status: 'ACTIVE',
      },
    });
    sellerId = seller.id;
  });

  afterAll(async () => {
    try {
      await cleanDatabase(prisma);
    } finally {
      await app.close();
    }
  });

  it('ARCHIVED product is not publicly accessible by slug -> 404', async () => {
    const cat = await makeCategory('archived-cat');
    await makeProduct({
      categoryId: cat.id,
      slug: 'archived-product',
      status: ProductStatus.ARCHIVED,
    });

    await request(app.getHttpServer())
      .get('/api/v1/products/archived-product')
      .expect(404);
  });

  it('ARCHIVED product is excluded from the public listing', async () => {
    const cat = await makeCategory('archived-list-cat');
    await makeProduct({
      categoryId: cat.id,
      slug: 'archived-listed-product',
      status: ProductStatus.ARCHIVED,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/products?limit=100')
      .expect(200);

    const slugs = JSON.stringify(
      response.body.items.map((p: { slug: string }) => p.slug),
    );
    expect(slugs).not.toContain('archived-listed-product');
  });

  it('listing response shape is { items, meta:{total,page,limit,totalPages} }', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/products?page=1&limit=10')
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.meta).toBeDefined();
    expect(typeof response.body.meta.total).toBe('number');
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(10);
    expect(typeof response.body.meta.totalPages).toBe('number');
  });

  it('public listing never leaks seller account identity', async () => {
    const cat = await makeCategory('identity-cat');
    await makeProduct({
      categoryId: cat.id,
      slug: 'identity-safe-product',
      status: ProductStatus.ACTIVE,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/products?limit=100')
      .expect(200);

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('disc-seller@example.com');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('disc-seller');
  });

  it('public detail returns seller store name but never private account data', async () => {
    const cat = await makeCategory('detail-cat');
    await makeProduct({
      categoryId: cat.id,
      slug: 'detail-safe-product',
      status: ProductStatus.ACTIVE,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/products/detail-safe-product')
      .expect(200);

    const body = JSON.stringify(response.body);
    expect(body).toContain('Discovery Store'); // public storefront name is fine
    expect(body).not.toContain('disc-seller@example.com');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('userId');
  });
});