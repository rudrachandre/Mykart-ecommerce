import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

jest.mock('cloudinary', () => {
  const mockUploadStream = jest.fn((options: any, callback: any) => ({
    end: jest.fn((buffer: Buffer) => {
      callback(null, {
        secure_url: 'https://res.cloudinary.com/test/image/upload/v1/mykart/products/test/test.png',
        public_id: 'mykart/products/test/test',
      });
    }),
  }));

  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: mockUploadStream,
        destroy: jest.fn((publicId: string, callback: any) => callback(null)),
      },
    },
  };
});

describe('ProductsController - Images (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sellerToken: string;
  let adminToken: string;
  let sellerId: string;
  let productId: string;

  async function setupApp() {
    process.env.CLOUDINARY_CLOUD_NAME = 'fake-cloud';
    process.env.CLOUDINARY_API_KEY = 'fake-key';
    process.env.CLOUDINARY_API_SECRET = 'fake-secret';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    prisma = app.get(PrismaService);
    await app.init();
  }

  beforeEach(async () => {
    await setupApp();
    await cleanDatabase(prisma);

    const password = await bcrypt.hash('password123', 10);

    const sellerUser = await prisma.user.create({
      data: {
        email: 'seller-img@example.com',
        passwordHash: password,
        name: 'Image Seller',
        role: Role.SELLER,
        seller: {
          create: {
            storeName: 'Image Store',
            slug: 'image-store',
          },
        },
      },
      include: { seller: true },
    });
    sellerId = sellerUser.seller!.id;

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-img@example.com',
        passwordHash: password,
        name: 'Image Admin',
        role: Role.ADMIN,
      },
    });

    const sellerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller-img@example.com', password: 'password123' });
    sellerToken = sellerLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-img@example.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const category = await prisma.category.create({
      data: { name: 'Test Category', slug: 'test-category-img' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Image Test Product',
        slug: 'image-test-product',
        description: 'Test description',
        basePrice: 100,
        categoryId: category.id,
        sellerId: sellerId,
      },
    });
    productId = product.id;
  });

  afterEach(async () => {
    try {
      await cleanDatabase(prisma);
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    await app.close();
  });

  it('/api/v1/products/:id/images (POST) - seller can upload image', async () => {
    const imageBuffer = Buffer.from('fake-image-data');
    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('file', imageBuffer, 'test.png');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('publicId');
    expect(response.body).toHaveProperty('productId', productId);
  });

  it('/api/v1/products/:id/images (POST) - rejects non-image file', async () => {
    const fileBuffer = Buffer.from('not-an-image');
    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('file', fileBuffer, 'test.txt');

    expect(response.status).toBe(400);
  });

  it('/api/v1/products/:id/images (POST) - rejects oversized file', async () => {
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('file', largeBuffer, 'large.png');

    expect(response.status).toBe(413);
  });

  it('/api/v1/products/:id/images (POST) - seller cannot upload to another sellers product', async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: 'other-seller-img@example.com',
        passwordHash: 'hash',
        name: 'Other Seller',
        role: Role.SELLER,
      },
    });
    const otherSeller = await prisma.seller.create({
      data: {
        userId: otherUser.id,
        storeName: 'Other Store',
        slug: 'other-store-img',
      },
    });

    const otherProduct = await prisma.product.create({
      data: {
        name: 'Other Product',
        slug: 'other-product-img',
        description: 'Other description',
        basePrice: 50,
        categoryId: (await prisma.category.findFirst())!.id,
        sellerId: otherSeller.id,
      },
    });

    const imageBuffer = Buffer.from('fake-image-data');
    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${otherProduct.id}/images`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('file', imageBuffer, 'test.png');

    expect(response.status).toBe(403);
  });

  it('/api/v1/products/:id/images (POST) - admin can upload to any product', async () => {
    const imageBuffer = Buffer.from('fake-image-data');
    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', imageBuffer, 'test.png');

    expect(response.status).toBe(201);
  });

  it('/api/v1/products/:id/images/:imageId (DELETE) - seller can delete own product image', async () => {
    const image = await prisma.productImage.create({
      data: {
        productId,
        url: 'https://example.com/test.png',
        sortOrder: 0,
      },
    });

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}/images/${image.id}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(response.status).toBe(200);

    const deleted = await prisma.productImage.findUnique({
      where: { id: image.id },
    });
    expect(deleted).toBeNull();
  });

  it('/api/v1/products/:id/images/:imageId (DELETE) - returns 404 for missing image', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}/images/nonexistent-image-id`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(response.status).toBe(404);
  });

  it('/api/v1/products/:id/images/:imageId (PATCH) - seller can update image metadata', async () => {
    const image = await prisma.productImage.create({
      data: {
        productId,
        url: 'https://example.com/test.png',
        alt: 'Original alt',
        sortOrder: 0,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}/images/${image.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ alt: 'Updated alt', sortOrder: 1 });

    expect(response.status).toBe(200);
    expect(response.body.alt).toBe('Updated alt');
    expect(response.body.sortOrder).toBe(1);
  });
});
