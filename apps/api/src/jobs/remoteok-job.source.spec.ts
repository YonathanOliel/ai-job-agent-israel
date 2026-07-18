import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { RemoteOkJobSource } from './remoteok-job.source';

describe('RemoteOkJobSource', () => {
  const config = {
    get: () => 50,
  } as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips the legal notice and non-tech roles, sends a User-Agent', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { legal: 'See https://remoteok.com/api for terms' },
        {
          id: '12345',
          position: 'Full Stack Developer',
          company: 'Globe',
          tags: ['dev', 'react', 'typescript'],
          description: '<p>Build with React</p>',
          location: 'Worldwide',
          url: 'https://remoteOK.com/remote-jobs/12345',
          date: '2026-07-10T00:00:00Z',
        },
        {
          id: '2',
          position: 'Virtual Assistant',
          tags: ['admin'],
          url: 'https://remoteOK.com/remote-jobs/2',
          company: 'Y',
        },
      ],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const jobs = await new RemoteOkJobSource(config).fetchJobs();

    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toBeTruthy();

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('12345');
    expect(job!.sourceUrl).toBe('https://remoteOK.com/remote-jobs/12345');
    expect(job!.isRemote).toBe(true);
    expect(job!.technologies).toEqual(expect.arrayContaining(['react', 'typescript']));
  });

  it('throws on a non-OK response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;
    await expect(new RemoteOkJobSource(config).fetchJobs()).rejects.toThrow(/403/);
  });
});
