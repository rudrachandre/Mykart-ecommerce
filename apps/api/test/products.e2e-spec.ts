import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sellerToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let sellerId: string;
  let categoryId: string;

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

    // Seed Seller
    const password = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'seller@example.com',
        passwordHash: password,
        name: 'Test Seller',
        role: Role.SELLER,
        seller: {
          create: {
            storeName: 'Test Store',
            slug: 'test-store',
          },
        },
      },
      include: {
        seller: true,
      },
    });
    sellerId = user.seller!.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller@example.com', password: 'password123' });
    sellerToken = loginRes.body.accessToken;

    // Seed Category
    const category = await prisma.category.create({
      data: { name: 'Electronics', slug: 'electronics' },
    });
    categoryId = category.id;
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

  it('/api/v1/products (POST) - seller can create product', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test Description',
        categoryId,
        basePrice: 100,
        variants: [{ sku: 'TEST-1', price: 100, inventory: { quantity: 10 } }],
      });

    if (response.status !== 201) {
      console.error('Products error:', response.body);
    }

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Product');
  });

  it('/api/v1/products (GET) - get all products', async () => {
    // Create one first
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Test Product',
        description: 'Test Description',
        categoryId,
        variants: [{ sku: 'TEST-1', price: 100, inventoryQuantity: 10 }],
      });

    const response = await request(app.getHttpServer())
      .get('/api/v1/products')
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body.items).toBeInstanceOf(Array);
  });
});
