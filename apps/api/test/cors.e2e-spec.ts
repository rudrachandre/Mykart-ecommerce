import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('CORS Security (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        const allowed = [
          'https://mykart-ecommerce-web.vercel.app',
          'http://localhost:3000',
          'http://localhost:3002',
        ];
        if (process.env.CORS_ORIGIN) {
          allowed.push(...process.env.CORS_ORIGIN.split(',').map((s) => s.trim()));
        }
        if (allowed.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows request from official frontend origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'https://mykart-ecommerce-web.vercel.app');

    expect(res.headers['access-control-allow-origin']).toBe('https://mykart-ecommerce-web.vercel.app');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows request from localhost:3000 development origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('disallows request from arbitrary Vercel subdomain', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'https://evil-unauthorized-app.vercel.app');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
