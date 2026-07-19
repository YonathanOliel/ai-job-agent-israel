import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CareerProfileModule } from './career-profile/career-profile.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResumesModule } from './resumes/resumes.module';
import { SearchModule } from './search/search.module';
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
    SearchModule,
    AuthModule,
    ResumesModule,
    CareerProfileModule,
    JobsModule,
    MatchingModule,
    OrganizationsModule,
    HealthModule,
    AdminModule,
  ],
})
export class AppModule {}
