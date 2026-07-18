import { ConfigService } from '@nestjs/config';
import { EmploymentType, SeniorityLevel } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { ArbeitnowJobSource } from './arbeitnow-job.source';

describe('ArbeitnowJobSource', () => {
  const config = {
    get: () => 50,
  } as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('keeps only tech roles and maps them with real URLs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            slug: 'a1',
            company_name: 'Acme',
            title: 'Senior Backend Engineer',
            description: '<p>Node.js &amp; AWS</p>',
            remote: true,
            url: 'https://www.arbeitnow.com/jobs/a1',
            tags: ['node.js', 'aws'],
            job_types: ['Full Time'],
            location: 'Berlin',
            created_at: 1700000000,
          },
          {
            slug: 'b2',
            company_name: 'SalesCo',
            title: 'Sales Manager',
            tags: ['sales'],
            url: 'https://www.arbeitnow.com/jobs/b2',
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const jobs = await new ArbeitnowJobSource(config).fetchJobs();

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('a1');
    expect(job!.sourceUrl).toBe('https://www.arbeitnow.com/jobs/a1');
    expect(job!.isRemote).toBe(true);
    expect(job!.seniority).toBe(SeniorityLevel.SENIOR);
    expect(job!.employmentType).toBe(EmploymentType.FULL_TIME);
    expect(job!.technologies).toEqual(expect.arrayContaining(['node.js', 'aws']));
    expect(job!.description).toBe('Node.js & AWS');
  });

  it('throws on a non-OK response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch;
    await expect(new ArbeitnowJobSource(config).fetchJobs()).rejects.toThrow(/502/);
  });
});
