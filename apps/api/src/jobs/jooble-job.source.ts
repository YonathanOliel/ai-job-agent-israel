import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LanguageCode, SeniorityLevel, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';

interface JoobleJob {
  id?: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
}

interface JoobleResponse {
  totalCount?: number;
  jobs?: JoobleJob[];
}

const REQUEST_TIMEOUT_MS = 15000;

// Small dictionary to enrich matching, since Jooble does not return tags.
const TECH_TERMS = [
  'typescript',
  'javascript',
  'node.js',
  'react',
  'next.js',
  'angular',
  'vue',
  'python',
  'django',
  'java',
  'spring',
  'c#',
  '.net',
  'c++',
  'go',
  'php',
  'ruby',
  'sql',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'graphql',
  'docker',
  'kubernetes',
  'aws',
  'gcp',
  'azure',
];

/**
 * Real Israeli job source backed by the official Jooble API. Enabled when
 * JOOBLE_API_KEY is configured (free key from https://jooble.org/api/about).
 * Uses the official API — no scraping.
 */
@Injectable()
export class JoobleJobSource implements JobSource {
  readonly name = 'jooble';
  private readonly logger = new Logger(JoobleJobSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const apiKey = this.config.get('JOOBLE_API_KEY', { infer: true });
    if (!apiKey) {
      this.logger.warn('JOOBLE_API_KEY is not set; skipping Jooble source');
      return [];
    }

    const base = this.config.get('JOOBLE_API_URL', { infer: true });
    const location = this.config.get('JOOBLE_LOCATION', { infer: true });
    const keywords = this.config.get('JOOBLE_KEYWORDS', { infer: true });
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${base}/${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, location, page: 1 }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Jooble responded with ${response.status}`);
      }
      const payload = (await response.json()) as JoobleResponse;
      return (payload.jobs ?? []).slice(0, limit).map((job) => this.toRawJob(job));
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: JoobleJob): RawJob {
    const description = this.stripHtml(job.snippet ?? '');
    const haystack = `${job.title} ${description}`.toLowerCase();
    const isRemote = /remote|work from home|מרחוק|מהבית/i.test(`${job.location} ${job.type}`);

    return {
      externalId: this.externalId(job),
      sourceUrl: job.link,
      title: job.title,
      company: job.company?.trim() || job.source || 'לא צוין',
      description: description.slice(0, 6000),
      location: job.location,
      city: job.location?.split(',')[0]?.trim(),
      isRemote,
      workArrangement: isRemote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      seniority: this.inferSeniority(job.title),
      language: /[\u0590-\u05ff]/.test(`${job.title}${description}`)
        ? LanguageCode.HE
        : LanguageCode.EN,
      technologies: TECH_TERMS.filter((term) => haystack.includes(term)),
      postedAt: job.updated ? new Date(job.updated) : undefined,
    };
  }

  private externalId(job: JoobleJob): string {
    if (job.id !== undefined) {
      return String(job.id);
    }
    return createHash('sha1').update(job.link).digest('hex').slice(0, 24);
  }

  private inferSeniority(title: string): SeniorityLevel | undefined {
    const t = title.toLowerCase();
    if (/\b(principal|staff|lead)\b|ראש צוות/.test(t)) return SeniorityLevel.LEAD;
    if (/\b(senior|sr\.?)\b|בכיר/.test(t)) return SeniorityLevel.SENIOR;
    if (/\b(junior|jr\.?|entry)\b|זוטר/.test(t)) return SeniorityLevel.JUNIOR;
    if (/\bdirector\b/.test(t)) return SeniorityLevel.DIRECTOR;
    if (/\bmanager\b|מנהל/.test(t)) return SeniorityLevel.MANAGER;
    return undefined;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
