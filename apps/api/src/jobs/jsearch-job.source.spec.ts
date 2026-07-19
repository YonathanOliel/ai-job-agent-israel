import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { JSearchJobSource } from './jsearch-job.source';

describe('JSearchJobSource', () => {
  const buildConfig = (key?: string): ConfigService<Env, true> =>
    ({
      get: (k: string) =>
        ({
          RAPIDAPI_KEY: key,
          JSEARCH_HOST: 'jsearch.p.rapidapi.com',
          JSEARCH_QUERY: 'developer jobs in israel',
          JOB_INGEST_LIMIT: 50,
        })[k],
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips when RAPIDAPI_KEY is not set', async () => {
    const jobs = await new JSearchJobSource(buildConfig(undefined)).fetchJobs();
    expect(jobs).toEqual([]);
  });

  it('keeps only Israel-located jobs and maps them with real apply links', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            job_id: 'x1',
            job_title: 'Senior Backend Engineer',
            employer_name: 'Acme',
            job_apply_link: 'https://acme.com/jobs/x1',
            job_description: 'Node.js and AWS',
            job_employment_type: 'FULLTIME',
            job_city: 'Tel Aviv',
            job_country: 'IL',
            job_posted_at_datetime_utc: '2026-07-01T00:00:00Z',
          },
          {
            job_id: 'x2',
            job_title: 'Frontend Engineer',
            employer_name: 'GlobalCo',
            job_apply_link: 'https://globalco.com/jobs/x2',
            job_city: 'Berlin',
            job_country: 'DE',
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const jobs = await new JSearchJobSource(buildConfig('key')).fetchJobs();

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('jsearch:x1');
    expect(job!.sourceUrl).toBe('https://acme.com/jobs/x1');
    expect(job!.company).toBe('Acme');
    expect(job!.employmentType).toBe(EmploymentType.FULL_TIME);
    expect(job!.technologies).toEqual(expect.arrayContaining(['node.js', 'aws']));
  });

  it('throws on a non-OK response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch;
    await expect(new JSearchJobSource(buildConfig('key')).fetchJobs()).rejects.toThrow(/429/);
  });
});
