import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus, OrderStatus } from '@prisma/client';

describe('ReviewsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;

  let customerId: string;
  let otherCustomerId: string;
  let productId: string;
  let reviewId: string;

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

    // 1. Create customer who purchases the product
    const customer = await prisma.user.create({
      data: {
        email: 'customer@example.com',
        passwordHash: password,
        name: 'Test Customer',
        role: Role.CUSTOMER,
      },
    });
    customerId = customer.id;

    // 2. Create another customer who doesn't purchase
    const otherCustomer = await prisma.user.create({
      data: {
        email: 'other@example.com',
        passwordHash: password,
        name: 'Other Customer',
        role: Role.CUSTOMER,
      },
    });
    otherCustomerId = otherCustomer.id;

    // 3. Create admin for moderation
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: password,
        name: 'Platform Admin',
        role: Role.ADMIN,
      },
    });

    // 4. Create a seller & product
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

    const product = await prisma.product.create({
      data: {
        name: 'Test Laptop',
        slug: 'test-laptop',
        description: 'Testing laptop description',
        basePrice: 50000,
        categoryId: category.id,
        sellerId: seller.id,
        status: ProductStatus.ACTIVE,
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'TEST-LAPTOP-SKU',
      },
    });

    // 5. Create a delivered order for the first customer
    const order = await prisma.order.create({
      data: {
        userId: customerId,
        status: OrderStatus.DELIVERED,
        subtotal: 50000,
        total: 50000,
        shippingAddress: {},
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            variantId: variant.id,
            quantity: 1,
            price: 50000,
          },
        },
      },
    });

    // Login users
    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'customer@example.com', password: 'password123' });
    customerToken = custLogin.body.accessToken;

    const otherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'other@example.com', password: 'password123' });
    otherCustomerToken = otherLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('POST /reviews - Create/Update Review', () => {
    it('should block non-authenticated requests', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reviews')
        .send({ productId, rating: 5, comment: 'Nice!' })
        .expect(401);
    });

    it('should block customers who have not purchased the product', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ productId, rating: 4, comment: 'Looks good but I did not buy it' })
        .expect(400);
    });

    it('should allow customer who purchased to submit a review', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, rating: 5, title: 'Excellent', comment: 'Super fast laptop!' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.rating).toBe(5);
      expect(res.body.verifiedPurchase).toBe(true);
      reviewId = res.body.id;
    });

    it('should allow updating an existing review', async () => {
      // Create first review
      const firstReview = await prisma.review.create({
        data: {
          userId: customerId,
          productId,
          rating: 4,
          comment: 'Good',
          verifiedPurchase: true,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, rating: 5, comment: 'Amazing now!' })
        .expect(201);

      expect(res.body.id).toBe(firstReview.id);
      expect(res.body.rating).toBe(5);
      expect(res.body.comment).toBe('Amazing now!');
    });
  });

  describe('GET /reviews/product/:productId - Get reviews with pagination', () => {
    beforeEach(async () => {
      // Seed some reviews
      await prisma.review.createMany({
        data: [
          { userId: customerId, productId, rating: 5, comment: 'R1', status: 'APPROVED' },
          { userId: customerId, productId, rating: 4, comment: 'R2', status: 'APPROVED' },
          { userId: customerId, productId, rating: 3, comment: 'R3', status: 'APPROVED' },
        ],
      });
    });

    it('should return paginated list of approved reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reviews/product/${productId}?page=1&limit=2`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body.items.length).toBe(2);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });
  });

  describe('DELETE /reviews/:id - Delete Review', () => {
    let testReviewId: string;

    beforeEach(async () => {
      const rev = await prisma.review.create({
        data: {
          userId: customerId,
          productId,
          rating: 5,
          comment: 'Review for deletion',
        },
      });
      testReviewId = rev.id;
    });

    it('should block non-owners from deleting', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);
    });

    it('should allow owner to delete their review', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });

    it('should allow admin to delete any review', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('POST /reviews/:id/helpful and /report', () => {
    let testReviewId: string;

    beforeEach(async () => {
      const rev = await prisma.review.create({
        data: {
          userId: customerId,
          productId,
          rating: 5,
          comment: 'Review to upvote',
        },
      });
      testReviewId = rev.id;
    });

    it('should allow voting helpful', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${testReviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(201);

      expect(res.body.helpfulVotes).toBe(1);
    });

    it('should allow reporting a review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${testReviewId}/report`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(201);

      expect(res.body.reported).toBe(true);
    });
  });

  describe('Admin Moderation API', () => {
    let reportedReviewId: string;

    beforeEach(async () => {
      const rev = await prisma.review.create({
        data: {
          userId: customerId,
          productId,
          rating: 1,
          comment: 'Spam comment',
          reported: true,
        },
      });
      reportedReviewId = rev.id;
    });

    it('should block non-admins from getting reported reviews', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reviews/reported')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should allow admins to get reported reviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/reported')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].id).toBe(reportedReviewId);
    });

    it('should allow admins to change status of a review', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reportedReviewId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SPAM' })
        .expect(200);

      expect(res.body.status).toBe('SPAM');
    });
  });
});
