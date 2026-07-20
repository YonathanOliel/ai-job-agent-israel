import { NotFoundException } from '@nestjs/common';
import { SeniorityLevel } from '@prisma/client';
import { JobFiltersDto } from '../jobs/dto/job-filters.dto';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SavedSearchesService } from './saved-searches.service';

describe('SavedSearchesService', () => {
  let prisma: {
    savedSearch: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let jobs: { list: jest.Mock };
  let service: SavedSearchesService;

  beforeEach(() => {
    prisma = {
      savedSearch: {
        create: jest.fn().mockImplementation((args) => ({ id: 's1', ...args.data })),
        findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    jobs = { list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }) };
    service = new SavedSearchesService(
      prisma as unknown as PrismaService,
      jobs as unknown as JobsService,
    );
  });

  it('creates a saved search for the current user', async () => {
    const result = await service.create('u1', {
      name: 'Senior React TLV',
      filters: { city: 'Tel Aviv', technology: 'react', seniority: SeniorityLevel.SENIOR },
    });

    expect(prisma.savedSearch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', name: 'Senior React TLV' }),
      }),
    );
    expect(result.id).toBe('s1');
  });

  it('lists only the current user-s saved searches, newest first', async () => {
    await service.listForUser('u1');
    expect(prisma.savedSearch.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('runs a saved search by mapping its filters into a job query', async () => {
    prisma.savedSearch.findFirst.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      filters: { technology: 'react', seniority: SeniorityLevel.SENIOR },
    });

    await service.run('u1', 's1', 2, 10);

    const passed = jobs.list.mock.calls[0]![0] as JobFiltersDto;
    expect(passed).toBeInstanceOf(JobFiltersDto);
    expect(passed.technology).toBe('react');
    expect(passed.seniority).toBe(SeniorityLevel.SENIOR);
    expect(passed.page).toBe(2);
    expect(passed.pageSize).toBe(10);
  });

  it('throws when running a saved search the user does not own', async () => {
    prisma.savedSearch.findFirst.mockResolvedValue(null);
    await expect(service.run('u1', 's9')).rejects.toBeInstanceOf(NotFoundException);
    expect(jobs.list).not.toHaveBeenCalled();
  });

  it('removes an owned saved search', async () => {
    prisma.savedSearch.deleteMany.mockResolvedValue({ count: 1 });
    await expect(service.remove('u1', 's1')).resolves.toBeUndefined();
    expect(prisma.savedSearch.deleteMany).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
    });
  });

  it('throws when removing a non-existent or unowned saved search', async () => {
    prisma.savedSearch.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('u1', 's9')).rejects.toBeInstanceOf(NotFoundException);
  });
});
