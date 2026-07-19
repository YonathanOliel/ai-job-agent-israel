import { SourceRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SourceRegistryService, sourceType } from './source-registry.service';

describe('SourceRegistryService', () => {
  it('classifies connector types by key', () => {
    expect(sourceType('greenhouse')).toBe('ATS');
    expect(sourceType('telegram')).toBe('COMMUNITY');
    expect(sourceType('remotive')).toBe('BOARD');
    expect(sourceType('jsearch')).toBe('AGGREGATOR');
    expect(sourceType('mystery')).toBe('API');
  });

  it('upserts a run with status, count and incremented totalRuns', async () => {
    const prisma = { source: { upsert: jest.fn().mockResolvedValue({}) } };
    const service = new SourceRegistryService(prisma as unknown as PrismaService);

    await service.recordRun('greenhouse', SourceRunStatus.SUCCESS, 42);

    const args = prisma.source.upsert.mock.calls[0]![0];
    expect(args.where).toEqual({ key: 'greenhouse' });
    expect(args.create).toMatchObject({
      key: 'greenhouse',
      type: 'ATS',
      lastJobCount: 42,
      totalRuns: 1,
    });
    expect(args.update).toMatchObject({ lastJobCount: 42, totalRuns: { increment: 1 } });
  });

  it('records failures with the error message', async () => {
    const prisma = { source: { upsert: jest.fn().mockResolvedValue({}) } };
    const service = new SourceRegistryService(prisma as unknown as PrismaService);

    await service.recordRun('telegram', SourceRunStatus.FAILED, 0, 'boom');

    const args = prisma.source.upsert.mock.calls[0]![0];
    expect(args.update.lastStatus).toBe(SourceRunStatus.FAILED);
    expect(args.update.lastError).toBe('boom');
  });
});
