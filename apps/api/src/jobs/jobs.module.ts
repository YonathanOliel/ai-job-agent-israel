import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { JOB_SOURCES, type JobSource } from './job-source.types';
import { ArbeitnowJobSource } from './arbeitnow-job.source';
import { JobIngestionService } from './job-ingestion.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JoobleJobSource } from './jooble-job.source';
import { RemoteOkJobSource } from './remoteok-job.source';
import { RemotiveJobSource } from './remotive-job.source';
import { SeedJobSource } from './seed-job.source';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    JobIngestionService,
    RemotiveJobSource,
    ArbeitnowJobSource,
    RemoteOkJobSource,
    JoobleJobSource,
    SeedJobSource,
    {
      provide: JOB_SOURCES,
      inject: [
        ConfigService,
        RemotiveJobSource,
        ArbeitnowJobSource,
        RemoteOkJobSource,
        JoobleJobSource,
        SeedJobSource,
      ],
      useFactory: (
        config: ConfigService<Env, true>,
        remotive: RemotiveJobSource,
        arbeitnow: ArbeitnowJobSource,
        remoteok: RemoteOkJobSource,
        jooble: JoobleJobSource,
        seed: SeedJobSource,
      ): JobSource[] => {
        // Public, no-key real tech sources are always on.
        const sources: JobSource[] = [remotive, arbeitnow, remoteok];
        // Enabled automatically once a free Jooble API key is configured.
        if (config.get('JOOBLE_API_KEY', { infer: true })) {
          sources.push(jooble);
        }
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
