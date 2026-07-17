import { PrismaService } from '../prisma/prisma.service';
import { JobIngestionService } from './job-ingestion.service';
import type { JobSource, RawJob } from './job-source.types';

describe('JobIngestionService', () => {
  const jobs: RawJob[] = [
    { externalId: 'a', title: 'Backend', company: 'Co', description: 'desc' },
    { externalId: 'b', title: 'Frontend', company: 'Co', description: 'desc' },
  ];

  let prisma: { job: { upsert: jest.Mock } };
  let source: JobSource;
  let service: JobIngestionService;

  beforeEach(() => {
    prisma = { job: { upsert: jest.fn().mockResolvedValue({}) } };
    source = { name: 'seed', fetchJobs: jest.fn().mockResolvedValue(jobs) };
    service = new JobIngestionService(prisma as unknown as PrismaService, [source]);
  });

  it('upserts every job from every source idempotently', async () => {
    const result = await service.ingest();

    expect(result.ingested).toBe(2);
    expect(result.sources).toEqual(['seed']);
    expect(prisma.job.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.job.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { source_externalId: { source: 'seed', externalId: 'a' } },
        create: expect.objectContaining({ source: 'seed', salaryCurrency: 'ILS' }),
      }),
    );
  });
});
