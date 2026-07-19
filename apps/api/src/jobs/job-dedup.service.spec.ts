import { JobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService } from '../search/job-search.service';
import { JobDedupService } from './job-dedup.service';

describe('JobDedupService', () => {
  const buildRow = (over: Record<string, unknown>) => ({
    id: 'x',
    source: 'telegram',
    description: 'desc',
    postedAt: new Date('2026-07-01'),
    lastSeenAt: new Date('2026-07-01'),
    dedupeKey: 'k1',
    status: JobStatus.ACTIVE,
    canonicalId: null,
    ...over,
  });

  it('keeps the most trusted job canonical and marks the rest DUPLICATE', async () => {
    const rows = [
      buildRow({ id: 'gh', source: 'greenhouse', description: 'a long description' }),
      buildRow({ id: 'tg', source: 'telegram', description: 'short' }),
    ];
    const prisma = {
      job: {
        findMany: jest.fn().mockResolvedValue(rows),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
      },
    };
    const search = { index: jest.fn().mockResolvedValue(undefined) };
    const service = new JobDedupService(
      prisma as unknown as PrismaService,
      search as unknown as JobSearchService,
    );

    const result = await service.reconcile();

    // Only the telegram duplicate is updated; greenhouse already canonical.
    expect(prisma.job.update).toHaveBeenCalledTimes(1);
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'tg' },
      data: { status: JobStatus.DUPLICATE, canonicalId: 'gh' },
    });
    expect(search.index).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ groups: 1, duplicates: 1, updated: 1 });
  });

  it('does nothing for singleton groups already canonical', async () => {
    const prisma = {
      job: {
        findMany: jest.fn().mockResolvedValue([buildRow({ id: 'solo', dedupeKey: 'k2' })]),
        update: jest.fn(),
      },
    };
    const search = { index: jest.fn() };
    const service = new JobDedupService(
      prisma as unknown as PrismaService,
      search as unknown as JobSearchService,
    );

    const result = await service.reconcile();

    expect(prisma.job.update).not.toHaveBeenCalled();
    expect(result).toEqual({ groups: 0, duplicates: 0, updated: 0 });
  });
});
