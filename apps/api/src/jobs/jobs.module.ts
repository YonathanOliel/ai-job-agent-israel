import { Module } from '@nestjs/common';
import { JOB_SOURCES, type JobSource } from './job-source.types';
import { JobIngestionService } from './job-ingestion.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SeedJobSource } from './seed-job.source';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    JobIngestionService,
    SeedJobSource,
    {
      provide: JOB_SOURCES,
      inject: [SeedJobSource],
      useFactory: (seed: SeedJobSource): JobSource[] => [seed],
    },
  ],
  exports: [JobsService],
})
export class JobsModule {}
