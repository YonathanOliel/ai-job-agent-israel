import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Job, Source, UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { EmbeddingService, type EmbeddingBackfillResult } from '../embeddings/embedding.service';
import { AtsDetectionService, type AtsDetection } from './ats-detection.service';
import { DiscoverDto } from './dto/discover.dto';
import { JobFiltersDto } from './dto/job-filters.dto';
import { IngestionQueueService } from './ingestion-queue.service';
import { JobDedupService, type DedupResult } from './job-dedup.service';
import { JobIngestionService, type IngestionResult } from './job-ingestion.service';
import { JobSemanticDedupService, type SemanticDedupResult } from './job-semantic-dedup.service';
import { JobStatsService, type JobStats } from './job-stats.service';
import { JobsService, type PaginatedJobs } from './jobs.service';
import { SourceRegistryService } from './source-registry.service';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly ingestion: JobIngestionService,
    private readonly queue: IngestionQueueService,
    private readonly dedup: JobDedupService,
    private readonly semanticDedup: JobSemanticDedupService,
    private readonly stats: JobStatsService,
    private readonly registry: SourceRegistryService,
    private readonly discovery: AtsDetectionService,
    private readonly embeddings: EmbeddingService,
  ) {}

  @Get()
  list(@Query() filters: JobFiltersDto): Promise<PaginatedJobs> {
    return this.jobs.list(filters);
  }

  @Roles(UserRole.ADMIN)
  @Get('stats')
  getStats(): Promise<JobStats> {
    return this.stats.compute();
  }

  @Roles(UserRole.ADMIN)
  @Get('sources')
  getSources(): Promise<Source[]> {
    return this.registry.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Job> {
    return this.jobs.getById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  ingest(): Promise<IngestionResult> {
    return this.ingestion.ingest();
  }

  @Roles(UserRole.ADMIN)
  @Post('ingest/enqueue')
  @HttpCode(HttpStatus.OK)
  enqueue(): Promise<{ enqueued: number }> {
    return this.queue.enqueueAll();
  }

  @Roles(UserRole.ADMIN)
  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  reindex(): Promise<{ indexed: number }> {
    return this.jobs.reindex();
  }

  @Roles(UserRole.ADMIN)
  @Post('embed-all')
  @HttpCode(HttpStatus.OK)
  embedAll(): Promise<EmbeddingBackfillResult> {
    return this.embeddings.backfillAll();
  }

  @Roles(UserRole.ADMIN)
  @Post('dedup')
  @HttpCode(HttpStatus.OK)
  runDedup(): Promise<DedupResult> {
    return this.dedup.reconcile();
  }

  @Roles(UserRole.ADMIN)
  @Post('dedup-semantic')
  @HttpCode(HttpStatus.OK)
  runSemanticDedup(): Promise<SemanticDedupResult> {
    return this.semanticDedup.reconcile();
  }

  @Roles(UserRole.ADMIN)
  @Post('discover')
  @HttpCode(HttpStatus.OK)
  discover(@Body() body: DiscoverDto): Promise<AtsDetection[]> {
    return this.discovery.discover(body.tokens);
  }
}
