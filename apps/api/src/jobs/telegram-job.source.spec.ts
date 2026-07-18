import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { TelegramJobSource } from './telegram-job.source';

describe('TelegramJobSource', () => {
  const buildConfig = (channels: string): ConfigService<Env, true> =>
    ({
      get: (key: string) =>
        (({ TELEGRAM_CHANNELS: channels, JOB_INGEST_LIMIT: 50 }) as Record<string, unknown>)[key],
    }) as unknown as ConfigService<Env, true>;

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const html = `
    <div class="tgme_widget_message" data-post="iljobs/100">
      <div class="tgme_widget_message_text">דרוש/ה Backend Developer עם ניסיון ב-Node.js ו-PostgreSQL.<br>עבודה מרחוק. להגשה: <a href="https://example.com/apply">כאן</a></div>
      <a class="tgme_widget_message_date" href="https://t.me/iljobs/100"><time datetime="2026-07-18T10:00:00+00:00"></time></a>
    </div>
    <div class="tgme_widget_message" data-post="iljobs/101">
      <div class="tgme_widget_message_text">בוקר טוב לכולם, שבוע נהדר!</div>
    </div>`;

  it('returns nothing when no channels are configured', async () => {
    const jobs = await new TelegramJobSource(buildConfig('')).fetchJobs();
    expect(jobs).toEqual([]);
  });

  it('parses job posts from a public channel and keeps the apply link', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => html });
    global.fetch = fetchMock as unknown as typeof fetch;

    const jobs = await new TelegramJobSource(buildConfig('@iljobs')).fetchJobs();

    expect(fetchMock.mock.calls[0]![0]).toBe('https://t.me/s/iljobs');
    // Only the "דרוש" message is a job; the greeting is skipped.
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.externalId).toBe('tg:iljobs/100');
    expect(job!.sourceUrl).toBe('https://example.com/apply');
    expect(job!.company).toBe('@iljobs');
    expect(job!.language).toBe('HE');
    expect(job!.isRemote).toBe(true);
    expect(job!.technologies).toEqual(expect.arrayContaining(['node.js', 'postgresql']));
    expect(job!.title).toContain('Backend Developer');
  });

  it('continues when a channel fails to load', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    const jobs = await new TelegramJobSource(buildConfig('missingchannel')).fetchJobs();
    expect(jobs).toEqual([]);
  });
});
