import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.validation';
import { JobIngestionService } from './job-ingestion.service';

const QUEUE_NAME = 'ingestion';
const JOB_NAME = 'ingest-source';

interface IngestJobData {
  source: string;
}

/**
 * Background ingestion queue (BullMQ on Redis). Fans out one job per source so
 * they run concurrently with independent retry/backoff. When INGEST_CRON is
 * configured, each source is (re)ingested automatically on that schedule.
 * Scheduling is off by default (empty cron), so behavior is opt-in and safe.
 */
@Injectable()
export class IngestionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionQueueService.name);
  private connection?: Redis;
  private queue?: Queue<IngestJobData>;
  private worker?: Worker<IngestJobData, number>;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly ingestion: JobIngestionService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get('REDIS_URL', { infer: true }) ?? 'redis://localhost:6379';
    this.connection = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });

    this.queue = new Queue<IngestJobData>(QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.config.get('INGEST_JOB_ATTEMPTS', { infer: true }),
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.worker = new Worker<IngestJobData, number>(
      QUEUE_NAME,
      (job) => this.ingestion.ingestSource(job.data.source),
      {
        connection: this.connection,
        concurrency: this.config.get('INGEST_CONCURRENCY', { infer: true }),
      },
    );
    this.worker.on('completed', (job, result) =>
      this.logger.log(`Ingest "${job.data.source}" completed: ${result} jobs`),
    );
    this.worker.on('failed', (job, error) =>
      this.logger.warn(`Ingest "${job?.data.source}" failed: ${error.message}`),
    );

    await this.scheduleRepeatable();
  }

  /** Enqueues an immediate ingestion job for every enabled source. */
  async enqueueAll(): Promise<{ enqueued: number }> {
    if (!this.queue) {
      return { enqueued: 0 };
    }
    const sources = this.ingestion.sourceNames();
    await this.queue.addBulk(sources.map((source) => ({ name: JOB_NAME, data: { source } })));
    return { enqueued: sources.length };
  }

  private async scheduleRepeatable(): Promise<void> {
    const cron = this.config.get('INGEST_CRON', { infer: true }).trim();
    if (!cron || !this.queue) {
      this.logger.log('INGEST_CRON not set; scheduled ingestion disabled');
      return;
    }
    for (const source of this.ingestion.sourceNames()) {
      await this.queue.add(JOB_NAME, { source }, { repeat: { pattern: cron } });
    }
    this.logger.log(
      `Scheduled ingestion at "${cron}" for ${this.ingestion.sourceNames().length} sources`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }
}
