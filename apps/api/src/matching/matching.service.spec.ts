import { MatchStatus, Prisma } from '@prisma/client';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchFiltersDto } from './dto/match-filters.dto';
import type { MatchResult, MatchScorer } from './match-score.types';
import { MatchingService } from './matching.service';

const scoreResult = {
  overall: 80,
  confidence: { score: 70, explanation: '' },
} as unknown as MatchResult;

describe('MatchingService', () => {
  let prisma: {
    careerProfile: { findUnique: jest.Mock };
    job: { findMany: jest.Mock };
    jobMatch: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let scorer: jest.Mocked<MatchScorer>;
  let service: MatchingService;

  const filters = (o: Partial<MatchFiltersDto> = {}): MatchFiltersDto =>
    Object.assign(new MatchFiltersDto(), { page: 1, pageSize: 20 }, o);

  beforeEach(() => {
    prisma = {
      careerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' }) },
      job: { findMany: jest.fn().mockResolvedValue([{ id: 'j1' }, { id: 'j2' }]) },
      jobMatch: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ id: 'm1', job: { id: 'j1' } }]),
        count: jest.fn().mockResolvedValue(2),
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', job: { id: 'j1' } }),
        update: jest.fn().mockResolvedValue({ id: 'm1', status: 'SAVED', job: { id: 'j1' } }),
      },
      $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
    };
    scorer = { name: 'deterministic', score: jest.fn().mockResolvedValue(scoreResult) };
    service = new MatchingService(prisma as unknown as PrismaService, scorer);
  });

  it('rejects generation without a career profile', async () => {
    prisma.careerProfile.findUnique.mockResolvedValue(null);
    await expect(service.generate('u1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('scores and upserts a match for every active job', async () => {
    const result = await service.generate('u1');

    expect(scorer.score).toHaveBeenCalledTimes(2);
    expect(prisma.jobMatch.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.jobMatch.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_jobId: { userId: 'u1', jobId: 'j1' } },
        create: expect.objectContaining({ overallScore: 80 }),
      }),
    );
    expect(result.generated).toBe(2);
    expect(result.total).toBe(2);
  });

  it('lists matches ranked by score', async () => {
    const result = await service.list('u1', filters({ minScore: 50, status: MatchStatus.NEW }));
    const args = prisma.jobMatch.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
    };
    expect(args.where).toEqual({ userId: 'u1', status: 'NEW', overallScore: { gte: 50 } });
    expect(args.orderBy).toEqual({ overallScore: 'desc' });
    expect(result.items).toHaveLength(1);
  });

  it('throws when a match is not found', async () => {
    prisma.jobMatch.findUnique.mockResolvedValue(null);
    await expect(service.get('u1', 'j9')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a match status', async () => {
    const result = await service.updateStatus('u1', 'j1', MatchStatus.SAVED);
    expect(prisma.jobMatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: MatchStatus.SAVED } }),
    );
    expect(result.status).toBe('SAVED');
  });

  it('maps a missing-record update to NotFound', async () => {
    prisma.jobMatch.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: '6.2.1',
      }),
    );
    await expect(service.updateStatus('u1', 'j9', MatchStatus.SAVED)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
