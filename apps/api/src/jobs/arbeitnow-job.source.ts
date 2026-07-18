import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType, LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';
import { extractTechnologies, inferSeniority, isTechRole, stripHtml } from './job-source.util';

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

const API_URL = 'https://www.arbeitnow.com/api/job-board-api';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Real tech job source backed by the public Arbeitnow job-board API (no key).
 * Filters to technology roles and preserves the real apply URL.
 */
@Injectable()
export class ArbeitnowJobSource implements JobSource {
  readonly name = 'arbeitnow';

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Arbeitnow responded with ${response.status}`);
      }
      const payload = (await response.json()) as ArbeitnowResponse;
      return (payload.data ?? [])
        .filter((job) => isTechRole(job.title))
        .slice(0, limit)
        .map((job) => this.toRawJob(job));
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: ArbeitnowJob): RawJob {
    const description = stripHtml(job.description ?? '');
    return {
      externalId: job.slug,
      sourceUrl: job.url,
      title: job.title,
      company: job.company_name,
      description: description.slice(0, 6000),
      location: job.location,
      city: job.location,
      isRemote: Boolean(job.remote),
      workArrangement: job.remote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      employmentType: this.mapEmployment(job.job_types ?? []),
      seniority: inferSeniority(job.title),
      language: LanguageCode.EN,
      technologies: extractTechnologies(
        `${job.title} ${(job.tags ?? []).join(' ')} ${description}`,
      ),
      postedAt: job.created_at ? new Date(job.created_at * 1000) : undefined,
    };
  }

  private mapEmployment(jobTypes: string[]): EmploymentType | undefined {
    const joined = jobTypes.join(' ').toLowerCase();
    if (/intern/.test(joined)) return EmploymentType.INTERNSHIP;
    if (/part/.test(joined)) return EmploymentType.PART_TIME;
    if (/contract|freelance|temporary/.test(joined)) return EmploymentType.CONTRACT;
    if (/full/.test(joined)) return EmploymentType.FULL_TIME;
    return undefined;
  }
}
