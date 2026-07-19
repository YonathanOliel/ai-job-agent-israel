import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { AshbyJobSource } from './ashby-job.source';

describe('AshbyJobSource', () => {
  const buildConfig = (companies: string): ConfigService<Env, true> =>
    ({
      get: (key: string) =>
        key === 'JOB_INGEST_LIMIT' ? 50 : key === 'ASHBY_COMPANIES' ? companies : '',
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps Israel-located tech jobs and keeps the apply link', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          jobs: [
            {
              id: 'j1',
              title: 'Data Scientist',
              location: 'Tel Aviv, Israel',
              isRemote: false,
              employmentType: 'FullTime',
              jobUrl: 'https://jobs.ashbyhq.com/lemonade/j1',
              descriptionPlain: 'Python and PyTorch',
              publishedAt: '2026-06-01T00:00:00Z',
            },
            {
              id: 'j2',
              title: 'Data Scientist',
              location: 'London, UK',
              jobUrl: 'https://jobs.ashbyhq.com/lemonade/j2',
              descriptionPlain: 'Python',
            },
          ],
        }),
      }),
    ) as unknown as typeof fetch;

    const jobs = await new AshbyJobSource(buildConfig('lemonade|Lemonade')).fetchJobs();

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('lemonade:j1');
    expect(job!.company).toBe('Lemonade');
    expect(job!.sourceUrl).toBe('https://jobs.ashbyhq.com/lemonade/j1');
    expect(job!.employmentType).toBe(EmploymentType.FULL_TIME);
    expect(job!.isRemote).toBe(false);
    expect(job!.technologies).toEqual(expect.arrayContaining(['python', 'pytorch']));
  });

  it('returns nothing when no companies are configured', async () => {
    const jobs = await new AshbyJobSource(buildConfig('')).fetchJobs();
    expect(jobs).toEqual([]);
  });
});
