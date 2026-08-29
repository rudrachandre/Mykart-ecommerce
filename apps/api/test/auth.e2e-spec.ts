import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MailService } from '../src/common/mail/mail.service';
import { cleanDatabase } from './utils/prisma-cleanup';
import { Redis } from './mocks/ioredis.mock';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const sentResetTokens: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendPasswordResetEmail: async (_to: string, token: string) => {
          sentResetTokens.push(token);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    // Matches main.ts: refresh/logout read refresh tokens from cookies.
    app.use(cookieParser());
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    Redis.store.clear();
    sentResetTokens.length = 0;
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

  it('/api/v1/auth/register (POST) - should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
  });

  it('/api/v1/auth/login (POST) - should login existing user', async () => {
    // Register first
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'test2@example.com',
      password: 'password123',
      name: 'Test User 2',
    });

    // Then login
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test2@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
  });

  it('/auth/forgot-password (POST) - unknown email returns generic 200 and sends nothing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@example.com' })
      .expect(200);

    expect(response.body.message).toContain('If an account exists');
    expect(sentResetTokens).toHaveLength(0);
  });

  it('/auth/forgot-password (POST) - existing email returns generic 200 and captures token', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'resetme@example.com',
      password: 'password123',
      name: 'Reset Me',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'resetme@example.com' })
      .expect(200);

    expect(response.body.message).toContain('If an account exists');
    expect(sentResetTokens).toHaveLength(1);
    expect(response.body).not.toHaveProperty('token');
    expect(JSON.stringify(response.body)).not.toContain(sentResetTokens[0]);
  });

  it('/auth/reset-password (POST) - invalid token is rejected', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'deadbeef', newPassword: 'newpassword123' })
      .expect(401);
  });

  it('/auth/reset-password (POST) - full flow: old password fails, new works, old session revoked', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'flow@example.com',
        password: 'password123',
        name: 'Flow User',
      })
      .expect(201);
    const oldRefreshCookie = register.headers['set-cookie'][0];

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'flow@example.com' })
      .expect(200);
    const resetToken = sentResetTokens[0];

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'newpassword123' })
      .expect(200);

    // Token is single-use.
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'anotherpass123' })
      .expect(401);

    // Old password no longer works.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'flow@example.com', password: 'password123' })
      .expect(401);

    // New password works.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'flow@example.com', password: 'newpassword123' })
      .expect(200);

    // Session issued before the reset is revoked (reuse detection path).
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .expect(401);
  });

  it('/auth/reset-password (POST) - rejects short password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'whatever', newPassword: 'short' })
      .expect(400);
  });

  it('/auth/logout-all (POST) - revokes every session and clears cookie', async () => {
    const register1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'multi@example.com',
        password: 'password123',
        name: 'Multi Device',
      })
      .expect(201);

    const login2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'multi@example.com', password: 'password123' })
      .expect(200);

    const cookie1 = register1.headers['set-cookie'][0];
    const cookie2 = login2.headers['set-cookie'][0];
    const accessToken = register1.body.accessToken;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.message).toContain('all devices');

    // Both device sessions must now be unusable.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie1)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie2)
      .expect(401);
  });

  it('/auth/logout-all (POST) - requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .expect(401);
  });
});
