import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { JOB_SOURCES, type JobSource } from './job-source.types';
import { JobIngestionService } from './job-ingestion.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { RemotiveJobSource } from './remotive-job.source';
import { SeedJobSource } from './seed-job.source';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    JobIngestionService,
    RemotiveJobSource,
    SeedJobSource,
    {
      provide: JOB_SOURCES,
      inject: [ConfigService, RemotiveJobSource, SeedJobSource],
      useFactory: (
        config: ConfigService<Env, true>,
        remotive: RemotiveJobSource,
        seed: SeedJobSource,
      ): JobSource[] => {
        const sources: JobSource[] = [remotive];
        if (config.get('ENABLE_SEED_JOBS', { infer: true })) {
          sources.push(seed);
        }
        return sources;
      },
    },
  ],
  exports: [JobsService],
})
export class JobsModule {}
