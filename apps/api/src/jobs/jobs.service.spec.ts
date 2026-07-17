import { NotFoundException } from '@nestjs/common';
import { JobStatus, SeniorityLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobFiltersDto } from './dto/job-filters.dto';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let prisma: {
    job: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: JobsService;

  const filters = (overrides: Partial<JobFiltersDto> = {}): JobFiltersDto =>
    Object.assign(new JobFiltersDto(), { page: 1, pageSize: 20 }, overrides);

  beforeEach(() => {
    prisma = {
      job: {
        findMany: jest.fn().mockResolvedValue([{ id: 'j1' }]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({ id: 'j1' }),
      },
      $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
    };
    service = new JobsService(prisma as unknown as PrismaService);
  });

  it('returns a paginated result scoped to active jobs', async () => {
    const result = await service.list(filters());

    expect(result).toEqual({ items: [{ id: 'j1' }], total: 1, page: 1, pageSize: 20 });
    const args = prisma.job.findMany.mock.calls[0]![0] as {
      where: { status: JobStatus };
      skip: number;
      take: number;
    };
    expect(args.where.status).toBe(JobStatus.ACTIVE);
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  it('builds filters for city, technology, seniority, and search', async () => {
    await service.list(
      filters({
        city: 'Tel Aviv',
        technology: 'TypeScript',
        seniority: SeniorityLevel.SENIOR,
        search: 'engineer',
      }),
    );

    const where = (prisma.job.findMany.mock.calls[0]![0] as { where: Record<string, unknown> })
      .where;
    expect(where.city).toEqual({ contains: 'Tel Aviv', mode: 'insensitive' });
    expect(where.technologies).toEqual({ has: 'typescript' });
    expect(where.seniority).toBe(SeniorityLevel.SENIOR);
    expect(Array.isArray(where.OR)).toBe(true);
  });

  it('applies pagination offsets', async () => {
    await service.list(filters({ page: 3, pageSize: 10 }));
    const args = prisma.job.findMany.mock.calls[0]![0] as { skip: number; take: number };
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
  });

  it('throws when a job is not found', async () => {
    prisma.job.findUnique.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
