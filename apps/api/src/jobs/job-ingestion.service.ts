import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job, JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService } from '../search/job-search.service';
import { buildContentHash, buildDedupeKey } from './job-dedup.util';
import { JOB_SOURCES, type JobSource, type RawJob } from './job-source.types';

export interface IngestionResult {
  ingested: number;
  sources: string[];
}

/**
 * Pulls postings from all enabled {@link JobSource}s and upserts them, keyed by
 * (source, externalId) so re-ingestion is idempotent. Each upserted posting is
 * also indexed into the search backend (best-effort).
 */
@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: JobSearchService,
    @Inject(JOB_SOURCES) private readonly sources: JobSource[],
  ) {}

  async ingest(): Promise<IngestionResult> {
    let ingested = 0;
    const succeeded: string[] = [];
    for (const source of this.sources) {
      try {
        ingested += await this.runSource(source);
        succeeded.push(source.name);
      } catch (error) {
        // A single failing source must not abort ingestion of the others.
        this.logger.error(`Source "${source.name}" failed during ingestion`, error as Error);
      }
    }
    return { ingested, sources: succeeded };
  }

  /** Names of all enabled sources (used to fan out scheduled ingestion). */
  sourceNames(): string[] {
    return this.sources.map((source) => source.name);
  }

  /** Ingests a single source by name. Throws so the queue can retry it. */
  async ingestSource(name: string): Promise<number> {
    const source = this.sources.find((candidate) => candidate.name === name);
    if (!source) {
      throw new Error(`Unknown job source "${name}"`);
    }
    return this.runSource(source);
  }

  private async runSource(source: JobSource): Promise<number> {
    const jobs = await source.fetchJobs();
    for (const job of jobs) {
      const persisted = await this.upsert(source.name, job);
      await this.search.index(persisted);
    }
    this.logger.log(`Ingested ${jobs.length} jobs from "${source.name}"`);
    return jobs.length;
  }

  private async upsert(source: string, job: RawJob): Promise<Job> {
    const data = this.toData(source, job);
    const now = new Date();
    return this.prisma.job.upsert({
      where: { source_externalId: { source, externalId: job.externalId } },
      // Track when we first and last observed the posting; only lastSeenAt moves
      // on re-ingestion so freshness/staleness can be derived later.
      create: { ...data, firstSeenAt: now, lastSeenAt: now },
      update: { ...data, lastSeenAt: now },
    });
  }

  private toData(source: string, job: RawJob): Prisma.JobUncheckedCreateInput {
    return {
      source,
      externalId: job.externalId,
      sourceUrl: job.sourceUrl,
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      city: job.city,
      isRemote: job.isRemote ?? false,
      workArrangement: job.workArrangement,
      employmentType: job.employmentType,
      seniority: job.seniority,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency ?? 'ILS',
      language: job.language,
      skills: job.skills ?? [],
      technologies: job.technologies ?? [],
      postedAt: job.postedAt,
      dedupeKey: buildDedupeKey(job.company, job.title, job.city),
      contentHash: buildContentHash(job.title, job.company, job.description),
      status: JobStatus.ACTIVE,
    };
  }
}
