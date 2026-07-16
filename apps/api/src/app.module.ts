import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CareerProfileModule } from './career-profile/career-profile.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResumesModule } from './resumes/resumes.module';
import { SecurityModule } from './security/security.module';
import { StorageModule } from './storage/storage.module';

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
    StorageModule,
    SecurityModule,
    AiModule,
    AuthModule,
    ResumesModule,
    CareerProfileModule,
    HealthModule,
  ],
})
export class AppModule {}
