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

interface FindworkJob {
  id: string;
  role: string;
  company_name?: string;
  employment_type?: string;
  location?: string;
  remote?: boolean;
  url: string;
  text?: string;
  date_posted?: string;
  keywords?: string[];
}

interface FindworkResponse {
  results?: FindworkJob[];
}

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Real jobs via the official Findwork.dev API. Enabled when FINDWORK_API_KEY is
 * set. Filtered to Israel-located roles. Official API — no scraping.
 */
@Injectable()
export class FindworkJobSource implements JobSource {
  readonly name = 'findwork';
  private readonly logger = new Logger(FindworkJobSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const apiKey = this.config.get('FINDWORK_API_KEY', { infer: true });
    if (!apiKey) {
      this.logger.warn('FINDWORK_API_KEY is not set; skipping Findwork source');
      return [];
    }
    const search = this.config.get('FINDWORK_SEARCH', { infer: true });
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const url = `https://findwork.dev/api/jobs/?search=${encodeURIComponent(search)}&location=israel&sort_by=date`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Token ${apiKey}`, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Findwork responded with ${response.status}`);
      }
      const payload = (await response.json()) as FindworkResponse;
      return (payload.results ?? [])
        .filter((job) => isIsraelLocation(job.location ?? ''))
        .slice(0, limit)
        .map((job) => this.toRawJob(job));
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: FindworkJob): RawJob {
    const description = stripHtml(job.text ?? '');
    return {
      externalId: `findwork:${job.id}`,
      sourceUrl: job.url,
      title: job.role,
      company: job.company_name?.trim() || 'לא צוין',
      description: description.slice(0, 6000),
      location: job.location,
      city: job.location?.split(',')[0]?.trim(),
      isRemote: Boolean(job.remote),
      workArrangement: job.remote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      employmentType: this.mapEmployment(job.employment_type),
      seniority: inferSeniority(job.role),
      language: LanguageCode.EN,
      technologies: extractTechnologies(
        `${job.role} ${(job.keywords ?? []).join(' ')} ${description}`,
      ),
      postedAt: job.date_posted ? new Date(job.date_posted) : undefined,
    };
  }

  private mapEmployment(type?: string): EmploymentType | undefined {
    const value = (type ?? '').toLowerCase();
    if (/intern/.test(value)) return EmploymentType.INTERNSHIP;
    if (/part/.test(value)) return EmploymentType.PART_TIME;
    if (/contract|freelance/.test(value)) return EmploymentType.CONTRACT;
    if (/full/.test(value)) return EmploymentType.FULL_TIME;
    return undefined;
  }
}
