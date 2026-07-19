import { Injectable, Logger } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService } from '../search/job-search.service';
import { pickCanonical, type RankableJob } from './job-source-trust.util';

export interface DedupResult {
  groups: number;
  duplicates: number;
  updated: number;
}

interface DedupRow extends RankableJob {
  dedupeKey: string | null;
  status: JobStatus;
  canonicalId: string | null;
}

/**
 * Collapses cross-source duplicates: postings sharing a dedupeKey are grouped,
 * a single canonical is kept ACTIVE, and the rest are marked DUPLICATE (pointing
 * at the canonical via canonicalId). Idempotent — safe to run after every
 * ingestion. Search documents are updated so duplicates drop out of results.
 */
@Injectable()
export class JobDedupService {
  private readonly logger = new Logger(JobDedupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: JobSearchService,
  ) {}

  async reconcile(): Promise<DedupResult> {
    const rows = (await this.prisma.job.findMany({
      where: { dedupeKey: { not: null }, status: { in: [JobStatus.ACTIVE, JobStatus.DUPLICATE] } },
      select: {
        id: true,
        source: true,
        description: true,
        postedAt: true,
        lastSeenAt: true,
        dedupeKey: true,
        status: true,
        canonicalId: true,
      },
    })) as DedupRow[];

    const groups = new Map<string, DedupRow[]>();
    for (const row of rows) {
      const key = row.dedupeKey!;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
    }

    let duplicates = 0;
    let updated = 0;
    let groupCount = 0;

    for (const group of groups.values()) {
      if (group.length > 1) {
        groupCount += 1;
      }
      const canonical = pickCanonical(group);
      for (const row of group) {
        const isCanonical = row.id === canonical.id;
        const desiredStatus = isCanonical ? JobStatus.ACTIVE : JobStatus.DUPLICATE;
        const desiredCanonicalId = isCanonical ? null : canonical.id;
        if (!isCanonical) {
          duplicates += 1;
        }
        // Only touch rows whose canonical/status actually changed.
        if (row.status === desiredStatus && row.canonicalId === desiredCanonicalId) {
          continue;
        }
        const job = await this.prisma.job.update({
          where: { id: row.id },
          data: { status: desiredStatus, canonicalId: desiredCanonicalId },
        });
        await this.search.index(job);
        updated += 1;
      }
    }

    this.logger.log(
      `Dedup reconcile: ${groupCount} duplicate groups, ${duplicates} duplicates, ${updated} updated`,
    );
    return { groups: groupCount, duplicates, updated };
  }
}
