import { Injectable } from '@nestjs/common';
import { Source, SourceRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Coarse connector category, derived from the source key. */
const SOURCE_TYPES: Record<string, string> = {
  greenhouse: 'ATS',
  lever: 'ATS',
  ashby: 'ATS',
  jooble: 'AGGREGATOR',
  jsearch: 'AGGREGATOR',
  careerjet: 'AGGREGATOR',
  findwork: 'AGGREGATOR',
  remotive: 'BOARD',
  arbeitnow: 'BOARD',
  remoteok: 'BOARD',
  telegram: 'COMMUNITY',
  seed: 'SEED',
};

export function sourceType(key: string): string {
  return SOURCE_TYPES[key] ?? 'API';
}

/**
 * Persists every connector as a {@link Source} row with its latest run health
 * (status, error, job count, timestamps). This is the seed of the source
 * registry that Discovery and the Admin command center build on.
 */
@Injectable()
export class SourceRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRun(
    key: string,
    status: SourceRunStatus,
    jobCount: number,
    error?: string,
  ): Promise<void> {
    const type = sourceType(key);
    const now = new Date();
    await this.prisma.source.upsert({
      where: { key },
      create: {
        key,
        type,
        lastRunAt: now,
        lastStatus: status,
        lastError: error ?? null,
        lastJobCount: jobCount,
        totalRuns: 1,
      },
      update: {
        type,
        lastRunAt: now,
        lastStatus: status,
        lastError: error ?? null,
        lastJobCount: jobCount,
        totalRuns: { increment: 1 },
      },
    });
  }

  list(): Promise<Source[]> {
    return this.prisma.source.findMany({ orderBy: { key: 'asc' } });
  }
}
