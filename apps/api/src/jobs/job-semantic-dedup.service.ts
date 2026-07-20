import { Injectable, Logger } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { JobSearchService } from '../search/job-search.service';
import { pickCanonical, type RankableJob } from './job-source-trust.util';

/**
 * Cosine-similarity threshold above which two same-company postings are
 * considered the same job. Expressed as pgvector cosine *distance* (1 - sim),
 * so the SQL predicate stays `<=> <= DISTANCE`.
 */
export const SEMANTIC_DEDUP_SIMILARITY = 0.92;
const SEMANTIC_DEDUP_DISTANCE = 1 - SEMANTIC_DEDUP_SIMILARITY;

export interface SemanticDedupResult {
  /** False when embeddings are disabled (no provider) — nothing was scanned. */
  enabled: boolean;
  /** Active jobs with an embedding that were eligible for comparison. */
  scanned: number;
  /** Clusters of 2+ near-duplicate postings that were collapsed. */
  groups: number;
  /** Non-canonical postings marked DUPLICATE. */
  duplicates: number;
  /** Rows whose status/canonicalId actually changed. */
  updated: number;
}

interface SimilarPair {
  aId: string;
  bId: string;
}

interface DedupJobRow extends RankableJob {
  status: JobStatus;
  canonicalId: string | null;
}

/**
 * Semantic deduplication: the same job posted across many sources with different
 * wording rarely shares a deterministic dedupeKey, so {@link JobDedupService}
 * misses it. This engine compares pgvector embeddings of ACTIVE, same-company
 * postings and collapses those whose cosine similarity clears
 * {@link SEMANTIC_DEDUP_SIMILARITY} into a single canonical job (the rest become
 * DUPLICATE pointing at the canonical). Requiring an exact company match keeps
 * the semantic signal from over-merging unrelated roles. A safe no-op when
 * embeddings are disabled; idempotent and admin-triggered.
 */
@Injectable()
export class JobSemanticDedupService {
  private readonly logger = new Logger(JobSemanticDedupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
    private readonly search: JobSearchService,
  ) {}

  async reconcile(): Promise<SemanticDedupResult> {
    if (!this.embeddings.enabled) {
      return { enabled: false, scanned: 0, groups: 0, duplicates: 0, updated: 0 };
    }

    const pairs = await this.findSimilarPairs();
    const scanned = await this.countEligible();
    if (pairs.length === 0) {
      return { enabled: true, scanned, groups: 0, duplicates: 0, updated: 0 };
    }

    const clusters = this.buildClusters(pairs);
    const ids = [...new Set(clusters.flat())];
    const rows = (await this.prisma.job.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        source: true,
        description: true,
        postedAt: true,
        lastSeenAt: true,
        status: true,
        canonicalId: true,
      },
    })) as DedupJobRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));

    let groups = 0;
    let duplicates = 0;
    let updated = 0;

    for (const cluster of clusters) {
      const group = cluster.map((id) => byId.get(id)).filter((row): row is DedupJobRow => !!row);
      if (group.length < 2) {
        continue;
      }
      groups += 1;
      const canonical = pickCanonical(group);
      for (const row of group) {
        const isCanonical = row.id === canonical.id;
        if (!isCanonical) {
          duplicates += 1;
        }
        const desiredStatus = isCanonical ? JobStatus.ACTIVE : JobStatus.DUPLICATE;
        const desiredCanonicalId = isCanonical ? null : canonical.id;
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
      `Semantic dedup: ${groups} groups, ${duplicates} duplicates, ${updated} updated (of ${scanned} scanned)`,
    );
    return { enabled: true, scanned, groups, duplicates, updated };
  }

  /** Returns near-duplicate pairs of ACTIVE, same-company postings. */
  private async findSimilarPairs(): Promise<SimilarPair[]> {
    return this.prisma.$queryRaw<SimilarPair[]>(Prisma.sql`
      SELECT a.id AS "aId", b.id AS "bId"
      FROM "jobs" a
      JOIN "jobs" b
        ON a.id < b.id
        AND lower(a.company) = lower(b.company)
      WHERE a.status = ${JobStatus.ACTIVE}::"JobStatus"
        AND b.status = ${JobStatus.ACTIVE}::"JobStatus"
        AND a.embedding IS NOT NULL
        AND b.embedding IS NOT NULL
        AND (a.embedding <=> b.embedding) <= ${SEMANTIC_DEDUP_DISTANCE}
    `);
  }

  private async countEligible(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT count(*) AS count
      FROM "jobs"
      WHERE status = ${JobStatus.ACTIVE}::"JobStatus" AND embedding IS NOT NULL
    `);
    return Number(rows[0]?.count ?? 0);
  }

  /** Union-find: turns similar pairs into connected clusters of job ids. */
  private buildClusters(pairs: SimilarPair[]): string[][] {
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let root = parent.get(x) ?? x;
      if (!parent.has(x)) {
        parent.set(x, x);
      }
      while (root !== parent.get(root)) {
        root = parent.get(root)!;
      }
      parent.set(x, root);
      return root;
    };
    const union = (a: string, b: string): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) {
        parent.set(ra, rb);
      }
    };

    for (const { aId, bId } of pairs) {
      union(aId, bId);
    }

    const clusters = new Map<string, string[]>();
    for (const id of parent.keys()) {
      const root = find(id);
      (clusters.get(root) ?? clusters.set(root, []).get(root)!).push(id);
    }
    return [...clusters.values()];
  }
}
