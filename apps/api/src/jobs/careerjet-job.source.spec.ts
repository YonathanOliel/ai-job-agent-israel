import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { CareerjetJobSource } from './careerjet-job.source';

describe('CareerjetJobSource', () => {
  const buildConfig = (affid?: string): ConfigService<Env, true> =>
    ({
      get: (k: string) =>
        ({
          CAREERJET_AFFID: affid,
          CAREERJET_KEYWORDS: 'developer',
          CAREERJET_LOCATION: 'Israel',
          JOB_INGEST_LIMIT: 50,
        })[k],
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips when CAREERJET_AFFID is not set', async () => {
    const jobs = await new CareerjetJobSource(buildConfig(undefined)).fetchJobs();
    expect(jobs).toEqual([]);
  });

  it('maps jobs with a stable id and real url', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'JOBS',
        jobs: [
          {
            title: 'DevOps Engineer',
            description: '<b>Kubernetes</b> and Terraform',
            company: 'Acme',
            locations: 'Tel Aviv, Israel',
            url: 'https://www.careerjet.co.il/jobad/abc123',
            date: 'Tue, 15 Jul 2026 00:00:00 GMT',
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const jobs = await new CareerjetJobSource(buildConfig('affid123')).fetchJobs();

    expect(fetchMock.mock.calls[0]![0]).toContain('affid=affid123');
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toMatch(/^careerjet:[0-9a-f]{16}$/);
    expect(job!.sourceUrl).toBe('https://www.careerjet.co.il/jobad/abc123');
    expect(job!.company).toBe('Acme');
    expect(job!.city).toBe('Tel Aviv');
    expect(job!.technologies).toEqual(expect.arrayContaining(['kubernetes', 'terraform']));
  });
});
