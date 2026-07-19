import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';
import { extractTechnologies, inferSeniority, stripHtml } from './job-source.util';

interface CareerjetJob {
  title: string;
  description?: string;
  company?: string;
  salary?: string;
  date?: string;
  url: string;
  locations?: string;
}

interface CareerjetResponse {
  type?: string;
  jobs?: CareerjetJob[];
}

const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AiJobAgentIsrael/1.0)';

/**
 * Real Israeli jobs via the official Careerjet public API (careerjet.co.il).
 * Enabled when CAREERJET_AFFID (free affiliate id) is set. Official API — no
 * scraping.
 */
@Injectable()
export class CareerjetJobSource implements JobSource {
  readonly name = 'careerjet';
  private readonly logger = new Logger(CareerjetJobSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const affid = this.config.get('CAREERJET_AFFID', { infer: true });
    if (!affid) {
      this.logger.warn('CAREERJET_AFFID is not set; skipping Careerjet source');
      return [];
    }
    const keywords = this.config.get('CAREERJET_KEYWORDS', { infer: true });
    const location = this.config.get('CAREERJET_LOCATION', { infer: true });
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const params = new URLSearchParams({
      affid,
      keywords,
      location,
      locale_code: 'en_GB',
      pagesize: String(Math.min(limit, 99)),
      page: '1',
      user_ip: '127.0.0.1',
      user_agent: USER_AGENT,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://public.api.careerjet.net/search?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Careerjet responded with ${response.status}`);
      }
      const payload = (await response.json()) as CareerjetResponse;
      return (payload.jobs ?? []).slice(0, limit).map((job) => this.toRawJob(job));
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: CareerjetJob): RawJob {
    const description = stripHtml(job.description ?? '');
    const isRemote = /remote|מרחוק|hybrid|היברידי/i.test(`${job.locations ?? ''} ${job.title}`);
    return {
      externalId: `careerjet:${createHash('sha1').update(job.url).digest('hex').slice(0, 16)}`,
      sourceUrl: job.url,
      title: job.title,
      company: job.company?.trim() || 'לא צוין',
      description: description.slice(0, 6000),
      location: job.locations,
      city: job.locations?.split(',')[0]?.trim(),
      isRemote,
      workArrangement: isRemote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      seniority: inferSeniority(job.title),
      language: /[\u0590-\u05ff]/.test(`${job.title}${description}`)
        ? LanguageCode.HE
        : LanguageCode.EN,
      technologies: extractTechnologies(`${job.title} ${description}`),
      postedAt: job.date ? this.parseDate(job.date) : undefined,
    };
  }

  private parseDate(value: string): Date | undefined {
    const time = Date.parse(value);
    return Number.isNaN(time) ? undefined : new Date(time);
  }
}
