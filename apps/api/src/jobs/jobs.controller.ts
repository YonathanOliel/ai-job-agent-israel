import {
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
import { JobFiltersDto } from './dto/job-filters.dto';
import { IngestionQueueService } from './ingestion-queue.service';
import { JobDedupService, type DedupResult } from './job-dedup.service';
import { JobIngestionService, type IngestionResult } from './job-ingestion.service';
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
    private readonly stats: JobStatsService,
    private readonly registry: SourceRegistryService,
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
  @Post('dedup')
  @HttpCode(HttpStatus.OK)
  runDedup(): Promise<DedupResult> {
    return this.dedup.reconcile();
  }
}
