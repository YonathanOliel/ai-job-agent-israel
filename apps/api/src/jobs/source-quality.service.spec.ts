import { JobStatus, SourceRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SourceQualityService } from './source-quality.service';

describe('SourceQualityService', () => {
  const makePrisma = (over: {
    active?: Array<{
      source: string;
      _count: { _all: number };
      _avg: { qualityScore: number | null };
    }>;
    dup?: Array<{ source: string; _count: { _all: number } }>;
    israel?: Array<{ source: string; _count: { _all: number } }>;
    fresh?: Array<{ source: string; _count: { _all: number } }>;
    sources?: Array<{ key: string; lastStatus: SourceRunStatus | null }>;
  }) => {
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce(over.active ?? [])
      .mockResolvedValueOnce(over.dup ?? [])
      .mockResolvedValueOnce(over.israel ?? [])
      .mockResolvedValueOnce(over.fresh ?? []);
    return {
      job: { groupBy },
      source: { findMany: jest.fn().mockResolvedValue(over.sources ?? []) },
    };
  };

  it('ranks sources by weighted overall score, most authoritative first', async () => {
    const prisma = makePrisma({
      active: [
        { source: 'greenhouse', _count: { _all: 100 }, _avg: { qualityScore: 80 } },
        { source: 'telegram', _count: { _all: 100 }, _avg: { qualityScore: 40 } },
      ],
      dup: [{ source: 'telegram', _count: { _all: 100 } }],
      israel: [
        { source: 'greenhouse', _count: { _all: 90 } },
        { source: 'telegram', _count: { _all: 20 } },
      ],
      fresh: [{ source: 'greenhouse', _count: { _all: 50 } }],
      sources: [
        { key: 'greenhouse', lastStatus: SourceRunStatus.SUCCESS },
        { key: 'telegram', lastStatus: SourceRunStatus.SUCCESS },
      ],
    });
    const service = new SourceQualityService(prisma as unknown as PrismaService);

    const report = await service.compute();

    expect(report.sources.map((s) => s.key)).toEqual(['greenhouse', 'telegram']);
    const gh = report.sources[0];
    expect(gh.activeJobs).toBe(100);
    expect(gh.israelJobs).toBe(90);
    expect(gh.scores.trust).toBe(100);
    expect(gh.scores.israel).toBe(90);
    expect(gh.scores.quality).toBe(80);
    expect(gh.scores.freshness).toBe(50);
    expect(gh.scores.dedup).toBe(100); // no duplicates
    // 100*.25 + 90*.25 + 80*.2 + 50*.15 + 100*.15 = 86
    expect(gh.scores.overall).toBe(86);

    const tg = report.sources[1];
    expect(tg.duplicateJobs).toBe(100);
    expect(tg.scores.dedup).toBe(50); // 100 dup of 200 total
    expect(tg.scores.overall).toBeLessThan(gh.scores.overall);
  });

  it('handles a source with no active jobs without dividing by zero', async () => {
    const prisma = makePrisma({
      active: [],
      dup: [],
      israel: [],
      fresh: [],
      sources: [{ key: 'findwork', lastStatus: null }],
    });
    const service = new SourceQualityService(prisma as unknown as PrismaService);

    const report = await service.compute();

    expect(report.sources).toHaveLength(1);
    const s = report.sources[0];
    expect(s.activeJobs).toBe(0);
    expect(s.scores.israel).toBe(0);
    expect(s.scores.freshness).toBe(0);
    expect(s.scores.dedup).toBe(100); // no jobs ⇒ no duplicates
  });
});
