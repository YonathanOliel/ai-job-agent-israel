import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  // Allow the web client to call the API. In development (no explicit list) we
  // reflect the request origin; in production, restrict via CORS_ORIGINS.
  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  const port = config.get('API_PORT', { infer: true });
  const host = config.get('API_HOST', { infer: true });

  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}/api`, 'Bootstrap');
}

void bootstrap();
