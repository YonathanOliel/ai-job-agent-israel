import { PrismaService } from '../prisma/prisma.service';
import { JobStatsService } from './job-stats.service';

describe('JobStatsService', () => {
  it('aggregates totals, sources, technologies and Israel coverage', async () => {
    const prisma = {
      job: {
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([
            { status: 'ACTIVE', _count: { _all: 10 } },
            { status: 'DUPLICATE', _count: { _all: 2 } },
          ])
          .mockResolvedValueOnce([
            { source: 'greenhouse', _count: { _all: 6 } },
            { source: 'telegram', _count: { _all: 4 } },
          ])
          .mockResolvedValueOnce([
            { seniority: 'SENIOR', _count: { _all: 5 } },
            { seniority: null, _count: { _all: 5 } },
          ]),
        findMany: jest
          .fn()
          .mockResolvedValue([{ company: 'A' }, { company: 'B' }, { company: 'C' }]),
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(4).mockResolvedValueOnce(8),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _max: { postedAt: new Date('2026-07-10T00:00:00Z') } }),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          { technology: 'typescript', count: 5n },
          { technology: 'python', count: 3n },
        ])
        .mockResolvedValueOnce([{ count: 7n }]),
    };

    const service = new JobStatsService(prisma as unknown as PrismaService);
    const stats = await service.compute();

    expect(stats.totals).toEqual({ active: 10, duplicate: 2, closed: 0, archived: 0, all: 12 });
    expect(stats.companies).toBe(3);
    expect(stats.bySource[0]).toEqual({ source: 'greenhouse', count: 6 });
    expect(stats.bySeniority).toContainEqual({ seniority: 'UNKNOWN', count: 5 });
    expect(stats.topTechnologies).toEqual([
      { technology: 'typescript', count: 5 },
      { technology: 'python', count: 3 },
    ]);
    expect(stats.freshness).toEqual({
      newInLast24h: 4,
      seenInLast7d: 8,
      newestPostedAt: '2026-07-10T00:00:00.000Z',
    });
    expect(stats.israel).toEqual({ located: 7, remote: 3 });
  });
});
