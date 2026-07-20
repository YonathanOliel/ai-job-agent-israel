import { Injectable } from '@nestjs/common';
import { JobStatus, SourceRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { israelJobWhere } from './israel-filter';
import { sourceTrust } from './job-source-trust.util';
import { sourceType } from './source-registry.service';

/**
 * Weights of the per-source sub-scores in the overall quality score. Trust and
 * Israeli relevance dominate (the platform's core mandate is Israel-only,
 * authoritative postings), followed by intrinsic job quality, freshness, and a
 * low duplicate ratio. Must sum to 1.
 */
export const SOURCE_QUALITY_WEIGHTS = {
  trust: 0.25,
  israel: 0.25,
  quality: 0.2,
  freshness: 0.15,
  dedup: 0.15,
} as const;

export interface SourceQualityScores {
  /** Source authoritativeness (official ATS > aggregator > community). */
  trust: number;
  /** Share of the source's active jobs located/remote in Israel. */
  israel: number;
  /** Mean intrinsic quality score of the source's active jobs. */
  quality: number;
  /** Share of active jobs first seen in the last 7 days. */
  freshness: number;
  /** 100 minus the source's duplicate ratio (higher = fewer duplicates). */
  dedup: number;
  /** Weighted overall score (0–100). */
  overall: number;
}

export interface SourceQuality {
  key: string;
  type: string;
  activeJobs: number;
  duplicateJobs: number;
  israelJobs: number;
  freshJobs: number;
  avgQualityScore: number;
  lastStatus: SourceRunStatus | null;
  scores: SourceQualityScores;
}

export interface SourceQualityReport {
  sources: SourceQuality[];
  generatedAt: string;
}

/**
 * Ranks every ingestion source by a composite quality score derived entirely
 * from data already in the jobs table and source registry — no external calls.
 * Lets the admin see which connectors deserve more investment (e.g. an
 * authoritative ATS with fresh, Israel-heavy, low-duplicate postings) versus
 * noisy community feeds. Read-only and deterministic.
 */
@Injectable()
export class SourceQualityService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(): Promise<SourceQualityReport> {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [activeBySource, dupBySource, israelBySource, freshBySource, sources] = await Promise.all(
      [
        this.prisma.job.groupBy({
          by: ['source'],
          where: { status: JobStatus.ACTIVE },
          _count: { _all: true },
          _avg: { qualityScore: true },
        }),
        this.prisma.job.groupBy({
          by: ['source'],
          where: { status: JobStatus.DUPLICATE },
          _count: { _all: true },
        }),
        this.prisma.job.groupBy({
          by: ['source'],
          where: { status: JobStatus.ACTIVE, ...israelJobWhere() },
          _count: { _all: true },
        }),
        this.prisma.job.groupBy({
          by: ['source'],
          where: { status: JobStatus.ACTIVE, firstSeenAt: { gte: week } },
          _count: { _all: true },
        }),
        this.prisma.source.findMany(),
      ],
    );

    const activeMap = new Map(
      activeBySource.map((row) => [
        row.source,
        { count: row._count._all, avg: row._avg.qualityScore ?? 0 },
      ]),
    );
    const dupMap = new Map(dupBySource.map((row) => [row.source, row._count._all]));
    const israelMap = new Map(israelBySource.map((row) => [row.source, row._count._all]));
    const freshMap = new Map(freshBySource.map((row) => [row.source, row._count._all]));
    const statusMap = new Map(sources.map((s) => [s.key, s.lastStatus ?? null]));

    const keys = new Set<string>([
      ...activeMap.keys(),
      ...dupMap.keys(),
      ...sources.map((s) => s.key),
    ]);

    const result: SourceQuality[] = [];
    for (const key of keys) {
      const active = activeMap.get(key) ?? { count: 0, avg: 0 };
      const duplicateJobs = dupMap.get(key) ?? 0;
      const israelJobs = israelMap.get(key) ?? 0;
      const freshJobs = freshMap.get(key) ?? 0;
      const activeJobs = active.count;
      const avgQualityScore = Math.round(active.avg);

      const total = activeJobs + duplicateJobs;
      const scores: SourceQualityScores = {
        trust: clamp(sourceTrust(key)),
        israel: activeJobs > 0 ? clamp((israelJobs / activeJobs) * 100) : 0,
        quality: clamp(avgQualityScore),
        freshness: activeJobs > 0 ? clamp((freshJobs / activeJobs) * 100) : 0,
        dedup: total > 0 ? clamp(100 - (duplicateJobs / total) * 100) : 100,
        overall: 0,
      };
      scores.overall = clamp(
        scores.trust * SOURCE_QUALITY_WEIGHTS.trust +
          scores.israel * SOURCE_QUALITY_WEIGHTS.israel +
          scores.quality * SOURCE_QUALITY_WEIGHTS.quality +
          scores.freshness * SOURCE_QUALITY_WEIGHTS.freshness +
          scores.dedup * SOURCE_QUALITY_WEIGHTS.dedup,
      );

      result.push({
        key,
        type: sourceType(key),
        activeJobs,
        duplicateJobs,
        israelJobs,
        freshJobs,
        avgQualityScore,
        lastStatus: statusMap.get(key) ?? null,
        scores,
      });
    }

    result.sort((a, b) => b.scores.overall - a.scores.overall || b.activeJobs - a.activeJobs);
    return { sources: result, generatedAt: new Date().toISOString() };
  }
}

/** Clamps a value to the 0–100 range and rounds to an integer. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
