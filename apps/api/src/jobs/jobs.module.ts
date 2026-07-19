import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { JOB_SOURCES, type JobSource } from './job-source.types';
import { ArbeitnowJobSource } from './arbeitnow-job.source';
import { AshbyJobSource } from './ashby-job.source';
import { AtsDetectionService } from './ats-detection.service';
import { CareerjetJobSource } from './careerjet-job.source';
import { CompanyRegistryService } from './company-registry.service';
import { FindworkJobSource } from './findwork-job.source';
import { GreenhouseJobSource } from './greenhouse-job.source';
import { IngestionQueueService } from './ingestion-queue.service';
import { JobDedupService } from './job-dedup.service';
import { JobIngestionService } from './job-ingestion.service';
import { JobStatsService } from './job-stats.service';
import { SourceRegistryService } from './source-registry.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JoobleJobSource } from './jooble-job.source';
import { JSearchJobSource } from './jsearch-job.source';
import { LeverJobSource } from './lever-job.source';
import { RemoteOkJobSource } from './remoteok-job.source';
import { RemotiveJobSource } from './remotive-job.source';
import { SeedJobSource } from './seed-job.source';
import { TelegramJobSource } from './telegram-job.source';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    JobIngestionService,
    JobDedupService,
    JobStatsService,
    SourceRegistryService,
    CompanyRegistryService,
    AtsDetectionService,
    IngestionQueueService,
    RemotiveJobSource,
    ArbeitnowJobSource,
    RemoteOkJobSource,
    JoobleJobSource,
    TelegramJobSource,
    GreenhouseJobSource,
    LeverJobSource,
    AshbyJobSource,
    JSearchJobSource,
    CareerjetJobSource,
    FindworkJobSource,
    SeedJobSource,
    {
      provide: JOB_SOURCES,
      inject: [
        ConfigService,
        RemotiveJobSource,
        ArbeitnowJobSource,
        RemoteOkJobSource,
        JoobleJobSource,
        TelegramJobSource,
        GreenhouseJobSource,
        LeverJobSource,
        AshbyJobSource,
        JSearchJobSource,
        CareerjetJobSource,
        FindworkJobSource,
        SeedJobSource,
      ],
      useFactory: (
        config: ConfigService<Env, true>,
        remotive: RemotiveJobSource,
        arbeitnow: ArbeitnowJobSource,
        remoteok: RemoteOkJobSource,
        jooble: JoobleJobSource,
        telegram: TelegramJobSource,
        greenhouse: GreenhouseJobSource,
        lever: LeverJobSource,
        ashby: AshbyJobSource,
        jsearch: JSearchJobSource,
        careerjet: CareerjetJobSource,
        findwork: FindworkJobSource,
        seed: SeedJobSource,
      ): JobSource[] => {
        // Public, no-key real tech sources are always on.
        const sources: JobSource[] = [remotive, arbeitnow, remoteok];
        // Enabled automatically once a free Jooble API key is configured.
        if (config.get('JOOBLE_API_KEY', { infer: true })) {
          sources.push(jooble);
        }
        // Enabled when public Telegram job channels are configured.
        if (config.get('TELEGRAM_CHANNELS', { infer: true }).trim()) {
          sources.push(telegram);
        }
        // Public ATS company boards — enabled when companies are configured.
        if (config.get('GREENHOUSE_COMPANIES', { infer: true }).trim()) {
          sources.push(greenhouse);
        }
        if (config.get('LEVER_COMPANIES', { infer: true }).trim()) {
          sources.push(lever);
        }
        if (config.get('ASHBY_COMPANIES', { infer: true }).trim()) {
          sources.push(ashby);
        }
        // Keyed aggregators — enabled automatically once their key is configured.
        if (config.get('RAPIDAPI_KEY', { infer: true })) {
          sources.push(jsearch);
        }
        if (config.get('CAREERJET_AFFID', { infer: true })) {
          sources.push(careerjet);
        }
        if (config.get('FINDWORK_API_KEY', { infer: true })) {
          sources.push(findwork);
        }
        if (config.get('ENABLE_SEED_JOBS', { infer: true })) {
          sources.push(seed);
        }
        return sources;
      },
    },
  ],
  exports: [JobsService, JobStatsService, SourceRegistryService, JobDedupService],
})
export class JobsModule {}
