import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType, LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';
import {
  extractTechnologies,
  inferSeniority,
  isIsraelLocation,
  stripHtml,
} from './job-source.util';

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name?: string;
  job_apply_link?: string;
  job_description?: string;
  job_is_remote?: boolean;
  job_employment_type?: string;
  job_city?: string;
  job_country?: string;
  job_posted_at_datetime_utc?: string;
}

interface JSearchResponse {
  data?: JSearchJob[];
}

const REQUEST_TIMEOUT_MS = 20000;

/**
 * Real Israeli jobs via JSearch (Google-for-Jobs aggregator on RapidAPI).
 * Enabled when RAPIDAPI_KEY is set. Uses the official RapidAPI endpoint — no
 * scraping. Broad coverage including postings surfaced from LinkedIn/Indeed.
 */
@Injectable()
export class JSearchJobSource implements JobSource {
  readonly name = 'jsearch';
  private readonly logger = new Logger(JSearchJobSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const apiKey = this.config.get('RAPIDAPI_KEY', { infer: true });
    if (!apiKey) {
      this.logger.warn('RAPIDAPI_KEY is not set; skipping JSearch source');
      return [];
    }
    const host = this.config.get('JSEARCH_HOST', { infer: true });
    const query = this.config.get('JSEARCH_QUERY', { infer: true });
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const url = `https://${host}/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&country=il`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`JSearch responded with ${response.status}`);
      }
      const payload = (await response.json()) as JSearchResponse;
      return (payload.data ?? [])
        .filter((job) => isIsraelLocation(`${job.job_city ?? ''} ${job.job_country ?? ''}`))
        .slice(0, limit)
        .map((job) => this.toRawJob(job));
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: JSearchJob): RawJob {
    const description = stripHtml(job.job_description ?? '');
    const location = [job.job_city, job.job_country].filter(Boolean).join(', ');
    return {
      externalId: `jsearch:${job.job_id}`,
      sourceUrl: job.job_apply_link,
      title: job.job_title,
      company: job.employer_name?.trim() || 'לא צוין',
      description: description.slice(0, 6000),
      location,
      city: job.job_city,
      isRemote: Boolean(job.job_is_remote),
      workArrangement: job.job_is_remote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      employmentType: this.mapEmployment(job.job_employment_type),
      seniority: inferSeniority(job.job_title),
      language: /[\u0590-\u05ff]/.test(`${job.job_title}${description}`)
        ? LanguageCode.HE
        : LanguageCode.EN,
      technologies: extractTechnologies(`${job.job_title} ${description}`),
      postedAt: job.job_posted_at_datetime_utc
        ? new Date(job.job_posted_at_datetime_utc)
        : undefined,
    };
  }

  private mapEmployment(type?: string): EmploymentType | undefined {
    const value = (type ?? '').toLowerCase();
    if (/intern/.test(value)) return EmploymentType.INTERNSHIP;
    if (/part/.test(value)) return EmploymentType.PART_TIME;
    if (/contract/.test(value)) return EmploymentType.CONTRACT;
    if (/full/.test(value)) return EmploymentType.FULL_TIME;
    return undefined;
  }
}
