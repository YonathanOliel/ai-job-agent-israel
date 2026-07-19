import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService } from '../search/job-search.service';
import { JobDedupService } from './job-dedup.service';
import { JobIngestionService } from './job-ingestion.service';
import type { JobSource, RawJob } from './job-source.types';

describe('JobIngestionService', () => {
  const jobs: RawJob[] = [
    { externalId: 'a', title: 'Backend', company: 'Co', description: 'desc' },
    { externalId: 'b', title: 'Frontend', company: 'Co', description: 'desc' },
  ];

  let prisma: { job: { upsert: jest.Mock } };
  let search: { index: jest.Mock };
  let dedup: { reconcile: jest.Mock };
  let source: JobSource;
  let service: JobIngestionService;

  beforeEach(() => {
    prisma = {
      job: { upsert: jest.fn().mockImplementation((args) => ({ id: 'x', ...args.create })) },
    };
    search = { index: jest.fn().mockResolvedValue(undefined) };
    dedup = { reconcile: jest.fn().mockResolvedValue({ groups: 0, duplicates: 0, updated: 0 }) };
    source = { name: 'seed', fetchJobs: jest.fn().mockResolvedValue(jobs) };
    service = new JobIngestionService(
      prisma as unknown as PrismaService,
      search as unknown as JobSearchService,
      dedup as unknown as JobDedupService,
      [source],
    );
  });

  it('upserts every job from every source idempotently and indexes them', async () => {
    const result = await service.ingest();

    expect(result.ingested).toBe(2);
    expect(result.sources).toEqual(['seed']);
    expect(prisma.job.upsert).toHaveBeenCalledTimes(2);
    expect(search.index).toHaveBeenCalledTimes(2);
    expect(dedup.reconcile).toHaveBeenCalledTimes(1);
    expect(prisma.job.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { source_externalId: { source: 'seed', externalId: 'a' } },
        create: expect.objectContaining({ source: 'seed', salaryCurrency: 'ILS' }),
      }),
    );
  });

  it('stamps dedupeKey/contentHash and only firstSeenAt on create', async () => {
    await service.ingest();

    const call = prisma.job.upsert.mock.calls[0]![0];
    expect(call.create.dedupeKey).toMatch(/^[0-9a-f]{24}$/);
    expect(call.create.contentHash).toEqual(expect.any(String));
    expect(call.create.firstSeenAt).toBeInstanceOf(Date);
    expect(call.create.lastSeenAt).toBeInstanceOf(Date);
    // Re-ingestion must not reset firstSeenAt.
    expect(call.update.firstSeenAt).toBeUndefined();
    expect(call.update.lastSeenAt).toBeInstanceOf(Date);
  });

  it('exposes source names for fan-out scheduling', () => {
    expect(service.sourceNames()).toEqual(['seed']);
  });

  it('ingests a single source by name', async () => {
    const count = await service.ingestSource('seed');

    expect(count).toBe(2);
    expect(prisma.job.upsert).toHaveBeenCalledTimes(2);
    expect(search.index).toHaveBeenCalledTimes(2);
  });

  it('throws for an unknown source so the queue can retry', async () => {
    await expect(service.ingestSource('nope')).rejects.toThrow(/Unknown job source/);
  });
});
