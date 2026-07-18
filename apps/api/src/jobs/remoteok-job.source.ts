import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';
import { extractTechnologies, inferSeniority, isTechRole, stripHtml } from './job-source.util';

interface RemoteOkJob {
  id?: string;
  position?: string;
  company?: string;
  tags?: string[];
  description?: string;
  location?: string;
  url: string;
  date?: string;
  legal?: string;
}

const API_URL = 'https://remoteok.com/api';
const REQUEST_TIMEOUT_MS = 15000;
// RemoteOK requires a descriptive User-Agent; requests without one are blocked.
const USER_AGENT = 'AiJobAgentIsrael/1.0 (job matching for candidates)';

/**
 * Real tech job source backed by the public RemoteOK API (no key). RemoteOK's
 * terms require attribution — we always link back via the real apply URL.
 */
@Injectable()
export class RemoteOkJobSource implements JobSource {
  readonly name = 'remoteok';

  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchJobs(): Promise<RawJob[]> {
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`RemoteOK responded with ${response.status}`);
      }
      const payload = (await response.json()) as RemoteOkJob[];
      return (
        payload
          // The first element is a legal notice; real jobs have a position.
          .filter((job) => job.position && isTechRole(job.position))
          .slice(0, limit)
          .map((job) => this.toRawJob(job))
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRawJob(job: RemoteOkJob): RawJob {
    const description = stripHtml(job.description ?? '');
    return {
      externalId: String(job.id ?? job.url),
      sourceUrl: job.url,
      title: job.position ?? 'Software Role',
      company: job.company ?? 'Unknown',
      description: description.slice(0, 6000),
      location: job.location || 'Remote',
      isRemote: true,
      workArrangement: WorkArrangement.REMOTE,
      seniority: inferSeniority(job.position ?? ''),
      language: LanguageCode.EN,
      technologies: extractTechnologies(
        `${job.position} ${(job.tags ?? []).join(' ')} ${description}`,
      ),
      postedAt: job.date ? new Date(job.date) : undefined,
    };
  }
}
