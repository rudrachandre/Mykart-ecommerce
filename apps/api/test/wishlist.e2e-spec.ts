import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

describe('WishlistController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let customerId: string;
  let productId1: string;
  let productId2: string;

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

    const password = await bcrypt.hash('password123', 10);

    // Create user
    const customer = await prisma.user.create({
      data: {
        email: 'customer@example.com',
        passwordHash: password,
        name: 'Test Customer',
        role: Role.CUSTOMER,
      },
    });
    customerId = customer.id;

    // Create a seller
    const sellerUser = await prisma.user.create({
      data: {
        email: 'seller@example.com',
        passwordHash: password,
        name: 'Test Seller',
        role: Role.SELLER,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'Test Seller Store',
        slug: 'test-seller-store',
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Electronics', slug: 'electronics' },
    });

    // Create 2 products
    const product1 = await prisma.product.create({
      data: {
        name: 'Laptop 1',
        slug: 'laptop-1',
        description: 'laptop 1 desc',
        basePrice: 40000,
        categoryId: category.id,
        sellerId: seller.id,
        status: ProductStatus.ACTIVE,
      },
    });
    productId1 = product1.id;

    const product2 = await prisma.product.create({
      data: {
        name: 'Laptop 2',
        slug: 'laptop-2',
        description: 'laptop 2 desc',
        basePrice: 60000,
        categoryId: category.id,
        sellerId: seller.id,
        status: ProductStatus.ACTIVE,
      },
    });
    productId2 = product2.id;

    // Login customer
    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'customer@example.com', password: 'password123' });
    customerToken = custLogin.body.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('Authenticated Wishlist Flow', () => {
    it('should add an item to the wishlist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: productId1 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.productId).toBe(productId1);
    });

    it('should retrieve the user wishlist', async () => {
      // Pre-add an item
      const wishlist = await prisma.wishlist.create({
        data: {
          userId: customerId,
          items: {
            create: { productId: productId1 },
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].productId).toBe(productId1);
    });

    it('should remove an item from the wishlist', async () => {
      const wishlist = await prisma.wishlist.create({
        data: {
          userId: customerId,
          items: {
            create: { productId: productId1 },
          },
        },
        include: { items: true },
      });

      const itemId = wishlist.items[0].id;

      await request(app.getHttpServer())
        .delete(`/api/v1/wishlist/items/${itemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const count = await prisma.wishlistItem.count({
        where: { id: itemId },
      });
      expect(count).toBe(0);
    });
  });

  describe('Guest Wishlist and Merging Flow', () => {
    it('should fetch guest wishlist details by query string of productIds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/wishlist/guest?productIds=${productId1},${productId2}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0].product.id).toBe(productId1);
      expect(res.body.items[1].product.id).toBe(productId2);
    });

    it('should merge guest wishlist items upon POST /wishlist/merge', async () => {
      // Customer has empty wishlist initially
      await request(app.getHttpServer())
        .post('/api/v1/wishlist/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productIds: [productId1, productId2] })
        .expect(201);

      const dbWishlist = await prisma.wishlist.findUnique({
        where: { userId: customerId },
        include: { items: true },
      });

      expect(dbWishlist?.items.length).toBe(2);
      const ids = dbWishlist?.items.map((i) => i.productId);
      expect(ids).toContain(productId1);
      expect(ids).toContain(productId2);
    });
  });
});
