import { JobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { JobSearchService } from '../search/job-search.service';
import { JobSemanticDedupService } from './job-semantic-dedup.service';

describe('JobSemanticDedupService', () => {
  const buildRow = (over: Record<string, unknown>) => ({
    id: 'x',
    source: 'telegram',
    description: 'desc',
    postedAt: new Date('2026-07-01'),
    lastSeenAt: new Date('2026-07-01'),
    status: JobStatus.ACTIVE,
    canonicalId: null,
    ...over,
  });

  const makeService = (opts: {
    enabled: boolean;
    pairs?: Array<{ aId: string; bId: string }>;
    rows?: Array<Record<string, unknown>>;
    count?: number;
  }) => {
    const embeddings = { enabled: opts.enabled } as unknown as EmbeddingService;
    const prisma = {
      $queryRaw: jest
        .fn()
        // First call: similar pairs. Second call: eligible count.
        .mockResolvedValueOnce(opts.pairs ?? [])
        .mockResolvedValueOnce([{ count: BigInt(opts.count ?? 0) }]),
      job: {
        findMany: jest.fn().mockResolvedValue(opts.rows ?? []),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
      },
    };
    const search = { index: jest.fn().mockResolvedValue(undefined) };
    const service = new JobSemanticDedupService(
      prisma as unknown as PrismaService,
      embeddings,
      search as unknown as JobSearchService,
    );
    return { service, prisma, search };
  };

  it('is a no-op when embeddings are disabled', async () => {
    const { service, prisma } = makeService({ enabled: false });

    const result = await service.reconcile();

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(result).toEqual({ enabled: false, scanned: 0, groups: 0, duplicates: 0, updated: 0 });
  });

  it('reports scanned count with zero groups when no similar pairs exist', async () => {
    const { service, prisma } = makeService({ enabled: true, pairs: [], count: 5 });

    const result = await service.reconcile();

    expect(prisma.job.update).not.toHaveBeenCalled();
    expect(result).toEqual({ enabled: true, scanned: 5, groups: 0, duplicates: 0, updated: 0 });
  });

  it('collapses a similar pair, keeping the most trusted source canonical', async () => {
    const { service, prisma, search } = makeService({
      enabled: true,
      pairs: [{ aId: 'gh', bId: 'tg' }],
      count: 2,
      rows: [
        buildRow({ id: 'gh', source: 'greenhouse', description: 'a much longer description' }),
        buildRow({ id: 'tg', source: 'telegram', description: 'short' }),
      ],
    });

    const result = await service.reconcile();

    expect(prisma.job.update).toHaveBeenCalledTimes(1);
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'tg' },
      data: { status: JobStatus.DUPLICATE, canonicalId: 'gh' },
    });
    expect(search.index).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ enabled: true, scanned: 2, groups: 1, duplicates: 1, updated: 1 });
  });

  it('merges transitive matches into a single cluster via union-find', async () => {
    const { service, prisma } = makeService({
      enabled: true,
      // a~b and b~c ⇒ {a,b,c} one cluster, one canonical, two duplicates.
      pairs: [
        { aId: 'a', bId: 'b' },
        { aId: 'b', bId: 'c' },
      ],
      count: 3,
      rows: [
        buildRow({ id: 'a', source: 'greenhouse', postedAt: new Date('2026-07-03') }),
        buildRow({ id: 'b', source: 'telegram', postedAt: new Date('2026-07-02') }),
        buildRow({ id: 'c', source: 'telegram', postedAt: new Date('2026-07-01') }),
      ],
    });

    const result = await service.reconcile();

    expect(result).toEqual({ enabled: true, scanned: 3, groups: 1, duplicates: 2, updated: 2 });
    // The greenhouse (most trusted) job 'a' stays canonical and is not updated.
    expect(prisma.job.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a' } }),
    );
  });
});
