import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_SOURCES, type JobSource, type RawJob } from './job-source.types';

export interface IngestionResult {
  ingested: number;
  sources: string[];
}

/**
 * Pulls postings from all enabled {@link JobSource}s and upserts them, keyed by
 * (source, externalId) so re-ingestion is idempotent.
 */
@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(JOB_SOURCES) private readonly sources: JobSource[],
  ) {}

  async ingest(): Promise<IngestionResult> {
    let ingested = 0;
    for (const source of this.sources) {
      const jobs = await source.fetchJobs();
      for (const job of jobs) {
        await this.upsert(source.name, job);
        ingested += 1;
      }
      this.logger.log(`Ingested ${jobs.length} jobs from "${source.name}"`);
    }
    return { ingested, sources: this.sources.map((s) => s.name) };
  }

  private async upsert(source: string, job: RawJob): Promise<void> {
    const data = this.toData(source, job);
    await this.prisma.job.upsert({
      where: { source_externalId: { source, externalId: job.externalId } },
      create: data,
      update: data,
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
      status: JobStatus.ACTIVE,
    };
  }
}
