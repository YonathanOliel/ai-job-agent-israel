import { ReferralStatus, WorkArrangement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { JobDedupService } from '../jobs/job-dedup.service';
import { JobSearchService } from '../search/job-search.service';
import type { ExtractedReferral } from './extracted-referral.schema';
import type { ReferralExtractor } from './referral-extractor.types';
import { ReferralsService } from './referrals.service';

const validExtraction: ExtractedReferral = {
  jobTitle: 'Senior Backend Developer',
  company: 'Acme',
  technologies: ['node.js', 'typescript'],
  seniority: null,
  workArrangement: WorkArrangement.HYBRID,
  location: 'Tel Aviv',
  confidence: 0.8,
};

const TECH_ISRAEL_TEXT =
  'Senior backend developer needed, Node.js and TypeScript, Tel Aviv, hybrid.';

describe('ReferralsService', () => {
  let prisma: {
    jobReferral: { create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    job: { upsert: jest.Mock };
  };
  let search: { index: jest.Mock };
  let embeddings: { embedJob: jest.Mock };
  let dedup: { reconcile: jest.Mock };
  let extractor: jest.Mocked<ReferralExtractor>;
  let service: ReferralsService;

  beforeEach(() => {
    prisma = {
      jobReferral: {
        create: jest.fn().mockResolvedValue({ id: 'r1', status: ReferralStatus.PENDING }),
        update: jest.fn().mockImplementation((args) => ({ id: 'r1', ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      job: { upsert: jest.fn().mockResolvedValue({ id: 'j1' }) },
    };
    search = { index: jest.fn().mockResolvedValue(undefined) };
    embeddings = { embedJob: jest.fn().mockResolvedValue(undefined) };
    dedup = { reconcile: jest.fn().mockResolvedValue({ groups: 0, duplicates: 0, updated: 0 }) };
    extractor = { name: 'heuristic', extract: jest.fn().mockResolvedValue(validExtraction) };
    service = new ReferralsService(
      prisma as unknown as PrismaService,
      search as unknown as JobSearchService,
      embeddings as unknown as EmbeddingService,
      dedup as unknown as JobDedupService,
      extractor,
    );
  });

  it('accepts a genuine Israeli tech referral and ingests it as a job', async () => {
    extractor.extract.mockResolvedValue({ ...validExtraction, confidence: 0.8 });

    const result = await service.submit('u1', { text: TECH_ISRAEL_TEXT });

    expect(prisma.job.upsert).toHaveBeenCalledTimes(1);
    expect(search.index).toHaveBeenCalledWith({ id: 'j1' });
    expect(embeddings.embedJob).toHaveBeenCalledWith({ id: 'j1' });
    expect(dedup.reconcile).toHaveBeenCalledTimes(1);
    expect(prisma.jobReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: { status: ReferralStatus.ACCEPTED, resultingJobId: 'j1' },
      }),
    );
    expect(result.status).toBe(ReferralStatus.ACCEPTED);
  });

  it('rejects low-confidence extractions', async () => {
    extractor.extract.mockResolvedValue({ ...validExtraction, confidence: 0.1 });

    await service.submit('u1', { text: TECH_ISRAEL_TEXT });

    expect(prisma.job.upsert).not.toHaveBeenCalled();
    expect(prisma.jobReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ReferralStatus.REJECTED }),
      }),
    );
  });

  it('rejects postings that are not a tech role', async () => {
    await service.submit('u1', { text: 'מחפשים טבח למסעדה בתל אביב, נסיון חובה.' });

    expect(prisma.job.upsert).not.toHaveBeenCalled();
    const call = prisma.jobReferral.update.mock.calls[0]![0];
    expect(call.data.status).toBe(ReferralStatus.REJECTED);
    expect(call.data.rejectionReason).toMatch(/tech roles/);
  });

  it('rejects postings that are not Israel-based', async () => {
    await service.submit('u1', {
      text: 'Senior backend developer needed, Node.js and TypeScript, Berlin, hybrid.',
    });

    expect(prisma.job.upsert).not.toHaveBeenCalled();
    const call = prisma.jobReferral.update.mock.calls[0]![0];
    expect(call.data.rejectionReason).toMatch(/Israel-based/);
  });

  it('rejects gracefully when the extractor throws', async () => {
    extractor.extract.mockRejectedValue(new Error('AI unavailable'));

    const result = await service.submit('u1', { text: TECH_ISRAEL_TEXT });

    expect(result.status).toBe(ReferralStatus.REJECTED);
    expect(prisma.job.upsert).not.toHaveBeenCalled();
  });

  it("lists the caller's own referrals ordered by recency", async () => {
    await service.listMine('u1');

    expect(prisma.jobReferral.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
