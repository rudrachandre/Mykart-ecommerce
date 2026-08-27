import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // The Razorpay webhook delivers a raw request body that must be verified
    // with HMAC-SHA256 before body parsing. Enabling raw body lets the
    // PaymentsController access `req.rawBody` without disabling the global
    // JSON parser for other routes.
    rawBody: true,
  });

  // Global prefix for all API routes
  app.setGlobalPrefix('api/v1');

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : process.env.NODE_ENV === 'production'
        ? ['https://mykart-ecommerce-web.vercel.app']
        : ['http://localhost:3000', 'http://localhost:3002'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());
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
