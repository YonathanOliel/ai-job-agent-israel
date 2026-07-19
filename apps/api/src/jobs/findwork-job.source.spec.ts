import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { FindworkJobSource } from './findwork-job.source';

describe('FindworkJobSource', () => {
  const buildConfig = (key?: string): ConfigService<Env, true> =>
    ({
      get: (k: string) =>
        ({ FINDWORK_API_KEY: key, FINDWORK_SEARCH: 'developer', JOB_INGEST_LIMIT: 50 })[k],
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips when FINDWORK_API_KEY is not set', async () => {
    const jobs = await new FindworkJobSource(buildConfig(undefined)).fetchJobs();
    expect(jobs).toEqual([]);
  });

  it('sends the token header and keeps only Israel-located jobs', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'f1',
            role: 'Backend Engineer',
            company_name: 'Acme',
            location: 'Tel Aviv, Israel',
            remote: false,
            url: 'https://findwork.dev/jobs/f1',
            text: '<p>Python and Django</p>',
            date_posted: '2026-07-01T00:00:00Z',
            keywords: ['python'],
          },
          {
            id: 'f2',
            role: 'Backend Engineer',
            company_name: 'GlobalCo',
            location: 'Remote',
            url: 'https://findwork.dev/jobs/f2',
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const jobs = await new FindworkJobSource(buildConfig('key')).fetchJobs();

    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Token key');
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('findwork:f1');
    expect(job!.company).toBe('Acme');
    expect(job!.technologies).toEqual(expect.arrayContaining(['python', 'django']));
  });
});
