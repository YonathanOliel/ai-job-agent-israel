import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType, LanguageCode, SeniorityLevel, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

const REQUEST_TIMEOUT_MS = 15000;

// Locations that a candidate based in Israel can typically apply to.
const ISRAEL_ELIGIBLE = /israel|worldwide|anywhere|global|emea|europe/i;

const EMPLOYMENT_TYPES: Record<string, EmploymentType> = {
  full_time: EmploymentType.FULL_TIME,
  part_time: EmploymentType.PART_TIME,
  contract: EmploymentType.CONTRACT,
  freelance: EmploymentType.CONTRACT,
  internship: EmploymentType.INTERNSHIP,
};

/**
 * Real job source backed by the public Remotive API. Returns genuine postings
 * with real apply URLs, filtered to roles open to candidates in Israel. Uses
 * the official public endpoint — no scraping.
 */
@Injectable()
export class RemotiveJobSource implements JobSource {
  readonly name = 'remotive';
  private readonly logger = new Logger(RemotiveJobSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const base = this.config.get('REMOTIVE_API_URL', { infer: true });
    const category = this.config.get('REMOTIVE_CATEGORY', { infer: true });
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${base}?category=${encodeURIComponent(category)}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Remotive responded with ${response.status}`);
      }
      const payload = (await response.json()) as RemotiveResponse;
      const jobs = payload.jobs ?? [];

      return jobs
        .filter((job) => ISRAEL_ELIGIBLE.test(job.candidate_required_location ?? ''))
        .slice(0, limit)
        .map((job) => this.toRawJob(job));
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: RemotiveJob): RawJob {
    return {
      externalId: String(job.id),
      sourceUrl: job.url,
      title: job.title,
      company: job.company_name,
      description: this.stripHtml(job.description ?? '').slice(0, 6000),
      location: job.candidate_required_location,
      isRemote: true,
      workArrangement: WorkArrangement.REMOTE,
      employmentType: job.job_type ? EMPLOYMENT_TYPES[job.job_type] : undefined,
      seniority: this.inferSeniority(job.title),
      language: LanguageCode.EN,
      technologies: this.normalizeTags(job.tags ?? []),
      postedAt: job.publication_date ? new Date(job.publication_date) : undefined,
    };
  }

  private inferSeniority(title: string): SeniorityLevel | undefined {
    const t = title.toLowerCase();
    if (/\b(principal|staff|lead)\b/.test(t)) return SeniorityLevel.LEAD;
    if (/\b(senior|sr\.?)\b/.test(t)) return SeniorityLevel.SENIOR;
    if (/\b(junior|jr\.?|entry)\b/.test(t)) return SeniorityLevel.JUNIOR;
    if (/\bdirector\b/.test(t)) return SeniorityLevel.DIRECTOR;
    if (/\bmanager\b/.test(t)) return SeniorityLevel.MANAGER;
    return undefined;
  }

  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
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
