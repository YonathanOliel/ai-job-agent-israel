import type { CareerProfile, Job } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { EmbeddingProvider } from '../ai/embedding-provider.types';
import { EmbeddingService } from './embedding.service';

const baseJob = {
  id: 'j1',
  title: 'Backend Engineer',
  company: 'Acme',
  seniority: null,
  technologies: ['node.js'],
  skills: [],
  description: 'desc',
} as unknown as Job;

const baseProfile = {
  id: 'p1',
  userId: 'u1',
  headline: 'Backend Engineer',
  summary: null,
  seniority: null,
  desiredRoles: [],
  technologies: ['node.js'],
  skills: [],
  yearsExperience: null,
} as unknown as CareerProfile;

describe('EmbeddingService', () => {
  let prisma: {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    job: { findMany: jest.Mock };
    careerProfile: { findMany: jest.Mock };
  };
  let provider: jest.Mocked<EmbeddingProvider>;

  beforeEach(() => {
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn(),
      job: { findMany: jest.fn().mockResolvedValue([]) },
      careerProfile: { findMany: jest.fn().mockResolvedValue([]) },
    };
    provider = {
      name: 'openai',
      dimensions: 3,
      embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
  });

  describe('when no provider is configured', () => {
    it('is disabled and every method is a safe no-op', async () => {
      const service = new EmbeddingService(prisma as unknown as PrismaService, null);

      expect(service.enabled).toBe(false);
      await service.embedJob(baseJob);
      await service.embedProfile(baseProfile);
      const similarity = await service.similarity('j1', 'u1');

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(similarity).toBeNull();
    });

    it('backfillAll reports disabled with zero counts', async () => {
      const service = new EmbeddingService(prisma as unknown as PrismaService, null);

      const result = await service.backfillAll();

      expect(result).toEqual({
        enabled: false,
        jobs: { total: 0, embedded: 0 },
        profiles: { total: 0, embedded: 0 },
      });
      expect(prisma.job.findMany).not.toHaveBeenCalled();
    });
  });

  describe('when a provider is configured', () => {
    it('is enabled and embeds a job', async () => {
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      expect(service.enabled).toBe(true);
      await service.embedJob(baseJob);

      expect(provider.embed).toHaveBeenCalledWith(expect.stringContaining('Backend Engineer'));
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('embeds a career profile', async () => {
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);
      await service.embedProfile(baseProfile);

      expect(provider.embed).toHaveBeenCalledWith(expect.stringContaining('Backend Engineer'));
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('swallows embedding failures without throwing', async () => {
      provider.embed.mockRejectedValue(new Error('rate limited'));
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      await expect(service.embedJob(baseJob)).resolves.toBe(false);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('backfillAll embeds every active job and profile and counts successes', async () => {
      prisma.job.findMany.mockResolvedValue([baseJob, { ...baseJob, id: 'j2' }]);
      prisma.careerProfile.findMany.mockResolvedValue([baseProfile]);
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      const result = await service.backfillAll();

      expect(result).toEqual({
        enabled: true,
        jobs: { total: 2, embedded: 2 },
        profiles: { total: 1, embedded: 1 },
      });
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('backfillAll counts only successfully persisted vectors', async () => {
      prisma.job.findMany.mockResolvedValue([baseJob, { ...baseJob, id: 'j2' }]);
      prisma.careerProfile.findMany.mockResolvedValue([]);
      provider.embed
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockRejectedValueOnce(new Error('rate limited'));
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      const result = await service.backfillAll();

      expect(result.jobs).toEqual({ total: 2, embedded: 1 });
    });

    it('returns cosine similarity from the query result', async () => {
      prisma.$queryRaw.mockResolvedValue([{ similarity: 0.87 }]);
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      const result = await service.similarity('j1', 'u1');

      expect(result).toBe(0.87);
    });

    it('returns null when either embedding is missing (empty result)', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      const result = await service.similarity('j1', 'u1');

      expect(result).toBeNull();
    });

    it('returns null when the similarity query throws', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('db down'));
      const service = new EmbeddingService(prisma as unknown as PrismaService, provider);

      const result = await service.similarity('j1', 'u1');

      expect(result).toBeNull();
    });
  });
});
