import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      // Single source of truth: the repo-root .env (this app runs from apps/api).
      envFilePath: ['../../.env'],
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
