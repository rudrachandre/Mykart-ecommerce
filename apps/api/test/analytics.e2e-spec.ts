import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

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
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: password,
        name: 'Test Admin',
        role: Role.ADMIN,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: password,
        name: 'Test User',
        role: Role.CUSTOMER,
      },
    });

    const loginResAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = loginResAdmin.body.accessToken;

    const loginResUser = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });
    userToken = loginResUser.body.accessToken;

    await prisma.auditLog.createMany({
      data: [
        {
          userId: user.id,
          action: 'USER_LOGIN',
          details: { ip: '127.0.0.1' },
        },
        {
          userId: user.id,
          action: 'ORDER_COMPLETED',
          details: { orderId: 'test-order' },
        },
        {
          userId: user.id,
          action: 'SELLER_ONBOARDED',
          details: { storeName: 'My Store' },
        },
      ],
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

  it('/analytics/dashboard (GET) - non-admin receives 403', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('/analytics/audit-logs (GET) - non-admin receives 403', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/audit-logs')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('/analytics/dashboard (GET) - ADMIN can access dashboard stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalOrders');
    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('totalProducts');
  });

  it('/analytics/audit-logs (GET) - ADMIN can retrieve audit logs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // Since we created logs manually and via login, it should have > 0
    expect(res.body.length).toBeGreaterThan(0);

    // Verify sensitive secrets/passwords/tokens are not stored in audit details
    const stringifiedResponse = JSON.stringify(res.body);
    expect(stringifiedResponse).not.toContain('password123');
    expect(stringifiedResponse).not.toContain('passwordHash');

    // Check for expected actions we logged manually or dynamically
    const actions = res.body.map((log: any) => log.action);
    expect(actions).toContain('USER_LOGIN');
    expect(actions).toContain('ORDER_COMPLETED');
  });
});
