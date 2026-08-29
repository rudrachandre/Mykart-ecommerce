import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role, ProductStatus } from '@prisma/client';

describe('RBAC & ownership security (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let sellerAToken: string;
  let sellerBToken: string;
  let customerAToken: string;
  let customerBToken: string;
  let supportToken: string;
  let productBId: string;
  let customerBAddressId: string;

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

    await prisma.user.create({
      data: {
        email: 'rbac-admin@example.com',
        passwordHash: password,
        name: 'RBAC Admin',
        role: Role.ADMIN,
      },
    });

    const makeSeller = async (
      email: string,
      storeName: string,
      slug: string,
      skuSuffix: string,
    ) => {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: password,
          name: storeName,
          role: Role.SELLER,
        },
      });
      const seller = await prisma.seller.create({
        data: { userId: user.id, storeName, slug, status: 'ACTIVE' },
      });
      const category = await prisma.category.create({
        data: { name: `${storeName} Cat`, slug: `${slug}-cat` },
      });
      return prisma.product.create({
        data: {
          name: `${storeName} Product`,
          slug: `${slug}-product`,
          description: 'desc',
          categoryId: category.id,
          sellerId: seller.id,
          status: ProductStatus.ACTIVE,
          basePrice: 50,
          variants: {
            create: [
              {
                sku: `${slug.toUpperCase()}-SKU-${skuSuffix}`,
                price: 50,
                inventory: { create: { quantity: 10 } },
              },
            ],
          },
        },
      });
    };

    await makeSeller('rbac-seller-a@example.com', 'RBAC Store A', 'rbac-store-a', 'A');
    const productB = await makeSeller('rbac-seller-b@example.com', 'RBAC Store B', 'rbac-store-b', 'B');
    productBId = productB.id;

    const makeCustomer = async (email: string, name: string, city: string) =>
      prisma.user.create({
        data: {
          email,
          passwordHash: password,
          name,
          role: Role.CUSTOMER,
          addresses: {
            create: {
              fullName: name,
              phone: '1000000000',
              addressLine1: `${city} Street`,
              city,
              state: 'AS',
              postalCode: '100001',
              country: 'India',
            },
          },
        },
      });

    const customerA = await makeCustomer('rbac-customer-a@example.com', 'RBAC Customer A', 'A City');
    const customerB = await makeCustomer('rbac-customer-b@example.com', 'RBAC Customer B', 'B City');

    customerBAddressId = (
      await prisma.address.findFirstOrThrow({ where: { userId: customerB.id } })
    ).id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' });
      return res.body.accessToken as string;
    };
    adminToken = await login('rbac-admin@example.com');
    sellerAToken = await login('rbac-seller-a@example.com');
    sellerBToken = await login('rbac-seller-b@example.com');
    customerAToken = await login('rbac-customer-a@example.com');
    customerBToken = await login('rbac-customer-b@example.com');

    // Admin-staff (SUPPORT) user — least-privilege read-only role.
    await prisma.user.create({
      data: {
        email: 'rbac-support@example.com',
        passwordHash: password,
        name: 'RBAC Support',
        role: Role.SUPPORT,
      },
    });
    supportToken = await login('rbac-support@example.com');
    expect(supportToken).toBeTruthy();
  });

  afterAll(async () => {
    try {
      await cleanDatabase(prisma);
    } finally {
      await app.close();
    }
  });

  // 1. No token
  it('no token on admin resource -> 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
  });

  // 2. Invalid token
  it('invalid token on admin resource -> 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  // 3. Customer -> admin resource
  it('customer -> admin users -> 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(403);
  });

  // 4. Customer -> seller resource
  it('customer -> seller profile -> 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/sellers/profile')
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(403);
  });

  // 5. Seller -> admin resource
  it('seller -> admin users -> 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${sellerAToken}`)
      .expect(403);
  });

  // 6. Seller A -> Seller B product
  it('seller A -> modify seller B product -> 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productBId}`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ name: 'Hijacked Name' })
      .expect(403);
  });

  it('seller A -> delete seller B product -> 403', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productBId}`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .expect(403);
  });

  // 7. Customer A -> Customer B address (ID manipulation)
  it('customer A -> modify customer B address -> 404 (no existence leak)', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/users/me/addresses/${customerBAddressId}`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        fullName: 'Hacker',
        phone: '9999999999',
        addressLine1: '9 Nowhere St',
        city: 'Hacked City',
        state: 'HS',
        postalCode: '999999',
        country: 'India',
      })
      .expect(404);
  });

  it('customer A -> delete customer B address -> 404', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/users/me/addresses/${customerBAddressId}`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(404);
  });

  // 8. Admin -> admin resource allowed
  it('admin -> admin users -> 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  // 9. Seller -> own resource allowed + isolated
  it('seller A -> own products -> 200, isolated from seller B', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/sellers/products')
      .set('Authorization', `Bearer ${sellerAToken}`)
      .expect(200);

    const items = Array.isArray(response.body)
      ? response.body
      : response.body.items ?? response.body.products ?? [];
    const names = JSON.stringify(items);
    expect(names).toContain('RBAC Store A');
    expect(names).not.toContain('RBAC Store B');
  });

  it('seller B -> own products -> 200, isolated from seller A', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/sellers/products')
      .set('Authorization', `Bearer ${sellerBToken}`)
      .expect(200);

    const items = Array.isArray(response.body)
      ? response.body
      : response.body.items ?? response.body.products ?? [];
    const names = JSON.stringify(items);
    expect(names).toContain('RBAC Store B');
    expect(names).not.toContain('RBAC Store A');
  });

  // 10. Customer -> own resource allowed
  it('customer -> own addresses -> 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(200);
  });

  it('customer -> own orders list -> 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(200);
  });

  // 14. Role escalation attempts
  it('customer -> role escalation attempt on admin endpoint -> 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/some-id/role')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
  });

  it('seller -> role escalation attempt on admin endpoint -> 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/some-id/role')
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
  });

  // 11. SUPPORT / admin staff — least privilege, never implicitly ADMIN
  it('SUPPORT -> admin-only endpoint -> 403 (RolesGuard)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(403);
  });

  it('SUPPORT -> seller resource -> 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/sellers/profile')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(403);
  });

  it('SUPPORT -> role escalation attempt -> 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/some-id/role')
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
  });

  it('SUPPORT -> moderation endpoint -> 403 (no PRODUCT_MODERATE permission)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${productBId}/status`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);
  });

  it('SUPPORT -> public read-only endpoint -> 200 (valid, functional user)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/products?page=1&limit=1')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(200);
  });
});

