import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

describe('CartController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userToken: string;
  let variantId: string;
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
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Seed User
    const password = await bcrypt.hash('password123', 10);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const user = await prisma.user.create({
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
    productId = product.id;
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

  it('/api/v1/cart/items (POST) - add item to cart', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, variantId, quantity: 2 });

    if (response.status !== 201) {
      console.error('Cart error:', response.body);
    }

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.quantity).toBe(2);
    expect(response.body.variantId).toBe(variantId);
  });
});
