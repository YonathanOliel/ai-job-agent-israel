import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LanguageCode } from '@prisma/client';
import { HTMLElement, parse } from 'node-html-parser';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';
import { extractTechnologies } from './job-source.util';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_CHANNELS = 15;
const USER_AGENT = 'Mozilla/5.0 (compatible; AiJobAgentIsrael/1.0)';

// A message is treated as a job post only if it clearly advertises a role.
const JOB_SIGNAL =
  /דרוש|דרושה|דרושים|דרושות|מגייס|מגייסת|מגייסים|משרה|משרת|hiring|we'?re hiring|join our team|job opening|open position|vacancy/i;

/**
 * Reads PUBLIC Telegram job channels via Telegram's public web preview
 * (t.me/s/<channel>) — no key or login required. Only channels explicitly
 * configured in TELEGRAM_CHANNELS are read, respecting their public nature.
 */
@Injectable()
export class TelegramJobSource implements JobSource {
  readonly name = 'telegram';
  private readonly logger = new Logger(TelegramJobSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const channels = this.channels();
    if (channels.length === 0) {
      return [];
    }
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const results: RawJob[] = [];
    for (const channel of channels) {
      try {
        results.push(...(await this.fetchChannel(channel)));
      } catch (error) {
        this.logger.error(`Failed to read Telegram channel "${channel}"`, error as Error);
      }
    }
    return results.slice(0, limit);
  }

  private channels(): string[] {
    return this.config
      .get('TELEGRAM_CHANNELS', { infer: true })
      .split(',')
      .map((c) => c.trim().replace(/^@/, ''))
      .filter(Boolean)
      .slice(0, MAX_CHANNELS);
  }

  private async fetchChannel(channel: string): Promise<RawJob[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://t.me/s/${encodeURIComponent(channel)}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Telegram responded with ${response.status}`);
      }
      return this.parseChannel(channel, await response.text());
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseChannel(channel: string, html: string): RawJob[] {
    const root = parse(html);
    const jobs: RawJob[] = [];

    for (const message of root.querySelectorAll('.tgme_widget_message')) {
      const dataPost = message.getAttribute('data-post');
      const textEl = message.querySelector('.tgme_widget_message_text');
      if (!dataPost || !textEl) {
        continue;
      }

      const text = this.extractText(textEl.innerHTML);
      if (!JOB_SIGNAL.test(text)) {
        continue;
      }

      const permalink = `https://t.me/${dataPost}`;
      const externalLink = this.firstExternalLink(textEl);
      const time = message.querySelector('time')?.getAttribute('datetime');

      jobs.push({
        externalId: `tg:${dataPost}`,
        sourceUrl: externalLink ?? permalink,
        title: this.firstLine(text).slice(0, 140),
        company: `@${channel}`,
        description: text.slice(0, 6000),
        isRemote: /remote|מרחוק|היברידי|hybrid/i.test(text),
        language: /[\u0590-\u05ff]/.test(text) ? LanguageCode.HE : LanguageCode.EN,
        technologies: extractTechnologies(text),
        postedAt: time ? new Date(time) : undefined,
      });
    }
    return jobs;
  }

  private firstExternalLink(textEl: HTMLElement): string | undefined {
    for (const anchor of textEl.querySelectorAll('a')) {
      const href = anchor.getAttribute('href');
      if (href && /^https?:\/\//i.test(href) && !href.includes('t.me/')) {
        return href;
      }
    }
    return undefined;
  }

  private extractText(innerHtml: string): string {
    return this.decodeEntities(innerHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private firstLine(text: string): string {
    return (
      text
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? text
    );
  }

  private decodeEntities(value: string): string {
    return value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  }
}
