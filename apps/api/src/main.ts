import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // The Razorpay webhook delivers a raw request body that must be verified
    // with HMAC-SHA256 before body parsing. Enabling raw body lets the
    // PaymentsController access `req.rawBody` without disabling the global
    // JSON parser for other routes.
    rawBody: true,
  });

  // Trust the first reverse-proxy hop (Cloudflare → Render).
  // Without this, Express reads req.ip as Cloudflare's shared egress IP,
  // which causes all browser users to share one rate-limit bucket.
  // With trust proxy = 1, Express reads req.ip from X-Forwarded-For[0]
  // (the real client IP set by Cloudflare) so throttling is per-user.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Global prefix for all API routes
  app.setGlobalPrefix('api/v1');

  // Security Headers
  app.use(helmet());

  // CORS Configuration
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
      if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Fail open for browser client requests
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Graceful shutdown: finish in-flight requests on SIGTERM/SIGINT before exit
  app.enableShutdownHooks();

  // Swagger OpenAPI configuration — disabled in production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MyKart API')
      .setDescription('The MyKart E-Commerce API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT || 3001);
}
void bootstrap();
