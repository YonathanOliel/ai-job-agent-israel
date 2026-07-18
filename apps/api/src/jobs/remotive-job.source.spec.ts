import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { RemotiveJobSource } from './remotive-job.source';

describe('RemotiveJobSource', () => {
  const config = {
    get: (key: string) =>
      (
        ({
          REMOTIVE_API_URL: 'https://remotive.com/api/remote-jobs',
          REMOTIVE_CATEGORY: 'software-dev',
          JOB_INGEST_LIMIT: 50,
        }) as Record<string, unknown>
      )[key],
  } as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockJobs = [
    {
      id: 1,
      url: 'https://remotive.com/remote-jobs/software-development/senior-node-1',
      title: 'Senior Node.js Engineer',
      company_name: 'Acme',
      tags: ['Node.js', 'TypeScript', 'AWS'],
      job_type: 'full_time',
      publication_date: '2026-07-01T00:00:00',
      candidate_required_location: 'Americas, Europe, Israel',
      description: '<p>Build <b>services</b> &amp; APIs.</p>',
    },
    {
      id: 2,
      url: 'https://remotive.com/remote-jobs/x/us-only-2',
      title: 'Backend Engineer',
      company_name: 'USOnly',
      tags: ['Python'],
      candidate_required_location: 'USA',
      description: 'US only role',
    },
    {
      id: 3,
      url: 'https://remotive.com/remote-jobs/x/worldwide-3',
      title: 'Junior Developer',
      company_name: 'Globe',
      tags: [],
      candidate_required_location: 'Worldwide',
      description: 'Anywhere',
    },
  ];

  it('maps only Israel-eligible jobs with real apply URLs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobs: mockJobs }),
    }) as unknown as typeof fetch;

    const jobs = await new RemotiveJobSource(config).fetchJobs();

    // The USA-only job is filtered out; Israel + Worldwide remain.
    expect(jobs).toHaveLength(2);
    const [senior, junior] = jobs;
    expect(senior!.externalId).toBe('1');
    expect(senior!.sourceUrl).toBe(
      'https://remotive.com/remote-jobs/software-development/senior-node-1',
    );
    expect(senior!.isRemote).toBe(true);
    expect(senior!.seniority).toBe('SENIOR');
    expect(senior!.technologies).toEqual(['node.js', 'typescript', 'aws']);
    expect(senior!.description).toBe('Build services & APIs.');
    expect(junior!.seniority).toBe('JUNIOR');
  });

  it('throws on a non-OK response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    await expect(new RemotiveJobSource(config).fetchJobs()).rejects.toThrow(/503/);
  });
});
