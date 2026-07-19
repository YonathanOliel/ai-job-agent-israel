import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { CompanyRegistryService } from './company-registry.service';
import { LeverJobSource } from './lever-job.source';

describe('LeverJobSource', () => {
  const registry = {
    listFor: jest.fn().mockResolvedValue([]),
  } as unknown as CompanyRegistryService;

  const buildConfig = (companies: string): ConfigService<Env, true> =>
    ({
      get: (key: string) =>
        key === 'JOB_INGEST_LIMIT' ? 50 : key === 'LEVER_COMPANIES' ? companies : '',
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps Israel-located tech postings and drops the rest', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: 'p1',
            text: 'Senior DevOps Engineer',
            hostedUrl: 'https://jobs.lever.co/walkme/p1',
            descriptionPlain: 'Kubernetes and Terraform on AWS',
            createdAt: 1700000000000,
            categories: { location: 'Tel Aviv, Israel', commitment: 'Full-time' },
          },
          {
            id: 'p2',
            text: 'Account Executive',
            hostedUrl: 'https://jobs.lever.co/walkme/p2',
            categories: { location: 'New York', commitment: 'Full-time' },
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const jobs = await new LeverJobSource(buildConfig('walkme|WalkMe'), registry).fetchJobs();

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('walkme:p1');
    expect(job!.company).toBe('WalkMe');
    expect(job!.sourceUrl).toBe('https://jobs.lever.co/walkme/p1');
    expect(job!.employmentType).toBe(EmploymentType.FULL_TIME);
    expect(job!.technologies).toEqual(expect.arrayContaining(['kubernetes', 'terraform', 'aws']));
  });

  it('returns nothing when no companies are configured', async () => {
    const jobs = await new LeverJobSource(buildConfig(''), registry).fetchJobs();
    expect(jobs).toEqual([]);
  });
});
