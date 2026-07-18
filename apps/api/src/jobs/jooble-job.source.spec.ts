import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { JoobleJobSource } from './jooble-job.source';

describe('JoobleJobSource', () => {
  const buildConfig = (apiKey?: string): ConfigService<Env, true> =>
    ({
      get: (key: string) =>
        (
          ({
            JOOBLE_API_URL: 'https://jooble.org/api',
            JOOBLE_API_KEY: apiKey,
            JOOBLE_LOCATION: 'Israel',
            JOOBLE_KEYWORDS: '',
            JOB_INGEST_LIMIT: 50,
          }) as Record<string, unknown>
        )[key],
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns nothing when no API key is configured', async () => {
    const jobs = await new JoobleJobSource(buildConfig(undefined)).fetchJobs();
    expect(jobs).toEqual([]);
  });

  it('maps real Israeli jobs with links, language, seniority, and tech', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 101,
            title: 'מפתח/ת Backend בכיר',
            location: 'תל אביב',
            snippet: 'עבודה עם Node.js ו-PostgreSQL',
            link: 'https://il.jooble.org/desc/123',
            company: 'חברת הייטק',
            updated: '2026-07-15',
          },
          {
            title: 'Senior React Developer',
            location: 'Herzliya',
            snippet: 'React and TypeScript role',
            link: 'https://il.jooble.org/desc/456',
            company: '',
            source: 'AllJobs',
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const jobs = await new JoobleJobSource(buildConfig('test-key')).fetchJobs();

    // Request went to the keyed endpoint with the location.
    expect(fetchMock.mock.calls[0]![0]).toBe('https://jooble.org/api/test-key');
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.location).toBe('Israel');

    expect(jobs).toHaveLength(2);
    const [first, second] = jobs;
    expect(first!.externalId).toBe('101');
    expect(first!.sourceUrl).toBe('https://il.jooble.org/desc/123');
    expect(first!.seniority).toBe('SENIOR');
    expect(first!.language).toBe('HE');
    expect(first!.technologies).toEqual(expect.arrayContaining(['node.js', 'postgresql']));

    // Missing company falls back to the source; missing id becomes a hash.
    expect(second!.company).toBe('AllJobs');
    expect(second!.externalId).toHaveLength(24);
    expect(second!.language).toBe('EN');
    expect(second!.technologies).toEqual(expect.arrayContaining(['react', 'typescript']));
  });

  it('throws on a non-OK response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;
    await expect(new JoobleJobSource(buildConfig('bad-key')).fetchJobs()).rejects.toThrow(/401/);
  });
});
