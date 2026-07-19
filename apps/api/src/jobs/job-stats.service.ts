import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface JobStats {
  totals: { active: number; duplicate: number; closed: number; archived: number; all: number };
  companies: number;
  bySource: Array<{ source: string; count: number }>;
  bySeniority: Array<{ seniority: string; count: number }>;
  topTechnologies: Array<{ technology: string; count: number }>;
  freshness: { newInLast24h: number; seenInLast7d: number; newestPostedAt: string | null };
  israel: { located: number; remote: number };
}

/**
 * Aggregate coverage/monitoring stats over the jobs table: totals by status,
 * distinct companies, per-source and per-seniority breakdowns, top technologies,
 * freshness, and Israeli coverage. Read-only.
 */
@Injectable()
export class JobStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(): Promise<JobStats> {
    const active = { status: JobStatus.ACTIVE };
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [byStatus, bySource, bySeniority, companies, remote, newest, newInLast24h, seenInLast7d] =
      await Promise.all([
        this.prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.job.groupBy({ by: ['source'], where: active, _count: { _all: true } }),
        this.prisma.job.groupBy({ by: ['seniority'], where: active, _count: { _all: true } }),
        this.prisma.job.findMany({
          where: active,
          distinct: ['company'],
          select: { company: true },
        }),
        this.prisma.job.count({ where: { ...active, isRemote: true } }),
        this.prisma.job.aggregate({ where: active, _max: { postedAt: true } }),
        this.prisma.job.count({ where: { ...active, firstSeenAt: { gte: day } } }),
        this.prisma.job.count({ where: { ...active, lastSeenAt: { gte: week } } }),
      ]);

    const [topTechnologies, israelLocated] = await Promise.all([
      this.topTechnologies(),
      this.countIsraelLocated(),
    ]);

    const statusCount = (status: JobStatus): number =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      totals: {
        active: statusCount(JobStatus.ACTIVE),
        duplicate: statusCount(JobStatus.DUPLICATE),
        closed: statusCount(JobStatus.CLOSED),
        archived: statusCount(JobStatus.ARCHIVED),
        all: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      },
      companies: companies.length,
      bySource: bySource
        .map((row) => ({ source: row.source, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      bySeniority: bySeniority.map((row) => ({
        seniority: row.seniority ?? 'UNKNOWN',
        count: row._count._all,
      })),
      topTechnologies,
      freshness: {
        newInLast24h,
        seenInLast7d,
        newestPostedAt: newest._max.postedAt?.toISOString() ?? null,
      },
      israel: { located: israelLocated, remote },
    };
  }

  private async topTechnologies(): Promise<Array<{ technology: string; count: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ technology: string; count: bigint }>>(
      Prisma.sql`
        SELECT unnest(technologies) AS technology, count(*)::bigint AS count
        FROM jobs
        WHERE status = 'ACTIVE'
        GROUP BY technology
        ORDER BY count DESC
        LIMIT 15
      `,
    );
    return rows.map((row) => ({ technology: row.technology, count: Number(row.count) }));
  }

  private async countIsraelLocated(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT count(*)::bigint AS count FROM jobs
        WHERE status = 'ACTIVE'
          AND (
            city ILIKE '%israel%' OR location ILIKE '%israel%'
            OR city ILIKE '%tel aviv%' OR city ILIKE '%herzliya%' OR city ILIKE '%haifa%'
            OR city ILIKE '%jerusalem%' OR city ILIKE '%netanya%' OR city ILIKE '%raanana%'
            OR city ILIKE '%petah%' OR city ILIKE '%beer sheva%' OR city ILIKE '%yokneam%'
            OR city ILIKE '%ramat gan%' OR city ILIKE '%rehovot%' OR city ILIKE '%rishon%'
            OR city ILIKE '%ישראל%' OR city ILIKE '%תל אביב%' OR city ILIKE '%חיפה%'
          )
      `,
    );
    return Number(rows[0]?.count ?? 0);
  }
}
