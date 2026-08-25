import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('NotificationsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;

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
    console.time('notifications-beforeEach');
    console.time('cleanDatabase');
    await cleanDatabase(prisma);
    console.timeEnd('cleanDatabase');

    console.time('hash');
    const password = await bcrypt.hash('password123', 10);
    console.timeEnd('hash');

    console.time('user.create');
    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: password,
        name: 'Test User',
        role: Role.CUSTOMER,
      },
    });
    userId = user.id;
    console.timeEnd('user.create');

    console.time('auth.login');
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });
    userToken = loginRes.body.accessToken;
    console.timeEnd('auth.login');
    console.timeEnd('notifications-beforeEach');

    // Seed some notifications
    await prisma.notification.createMany({
      data: [
        {
          userId,
          title: 'Welcome',
          message: 'Welcome to MyKart',
          type: 'INFO',
          read: false,
        },
        {
          userId,
          title: 'Order Created',
          message: 'Your order was created successfully',
          type: 'ORDER_UPDATE',
          read: false,
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

  it('/notifications (GET) - unauthorized', () => {
    return request(app.getHttpServer())
      .get('/api/v1/notifications')
      .expect(401);
  });

  it('/notifications (GET) - retrieve notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('read');
  });

  it('/notifications/:id/read (PATCH) - mark as read', async () => {
    const notifsRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    const notifId = notifsRes.body[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.read).toBe(true);
  });

  it('/notifications/read-all (POST) - mark all as read', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201); // POST returns 201 by default

    const notifsRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    notifsRes.body.forEach((notif: any) => {
      expect(notif.read).toBe(true);
    });
  });
});
