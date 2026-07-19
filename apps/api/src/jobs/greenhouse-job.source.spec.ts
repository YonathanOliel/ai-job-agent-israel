import { ConfigService } from '@nestjs/config';
import { SeniorityLevel } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { GreenhouseJobSource } from './greenhouse-job.source';

describe('GreenhouseJobSource', () => {
  const buildConfig = (companies: string): ConfigService<Env, true> =>
    ({
      get: (key: string) =>
        key === 'JOB_INGEST_LIMIT' ? 50 : key === 'GREENHOUSE_COMPANIES' ? companies : '',
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('keeps only Israel-located tech roles and continues past a broken board', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/boards/acme/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            jobs: [
              {
                id: 1,
                title: 'Senior Backend Engineer',
                absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
                updated_at: '2026-07-01T00:00:00Z',
                location: { name: 'Tel Aviv, Israel' },
                content: '&lt;p&gt;We use Node.js and AWS&lt;/p&gt;',
              },
              {
                id: 2,
                title: 'Backend Engineer',
                absolute_url: 'https://boards.greenhouse.io/acme/jobs/2',
                location: { name: 'Berlin, Germany' },
                content: '&lt;p&gt;Node.js&lt;/p&gt;',
              },
              {
                id: 3,
                title: 'Office Manager',
                absolute_url: 'https://boards.greenhouse.io/acme/jobs/3',
                location: { name: 'Tel Aviv' },
                content: 'admin',
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const jobs = await new GreenhouseJobSource(buildConfig('acme|Acme Corp,brokenco')).fetchJobs();

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('acme:1');
    expect(job!.company).toBe('Acme Corp');
    expect(job!.sourceUrl).toBe('https://boards.greenhouse.io/acme/jobs/1');
    expect(job!.description).toBe('We use Node.js and AWS');
    expect(job!.seniority).toBe(SeniorityLevel.SENIOR);
    expect(job!.technologies).toEqual(expect.arrayContaining(['node.js', 'aws']));
  });

  it('returns nothing when no companies are configured', async () => {
    const jobs = await new GreenhouseJobSource(buildConfig('')).fetchJobs();
    expect(jobs).toEqual([]);
  });

  it('prettifies the display name when only a token is given', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          jobs: [
            {
              id: 9,
              title: 'DevOps Engineer',
              absolute_url: 'https://boards.greenhouse.io/big-data-co/jobs/9',
              location: { name: 'Haifa, Israel' },
              content: 'kubernetes',
            },
          ],
        }),
      }),
    ) as unknown as typeof fetch;

    const jobs = await new GreenhouseJobSource(buildConfig('big-data-co')).fetchJobs();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.company).toBe('Big Data Co');
  });
});
