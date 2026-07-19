import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { AtsCompanySource, type AtsCompany } from './ats-company.source';
import type { RawJob } from './job-source.types';
import {
  decodeHtmlEntities,
  extractTechnologies,
  inferSeniority,
  stripHtml,
} from './job-source.util';

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  content?: string;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

/**
 * Real Israeli jobs from company boards on Greenhouse's public API (no key):
 * https://boards-api.greenhouse.io/v1/boards/{token}/jobs
 */
@Injectable()
export class GreenhouseJobSource extends AtsCompanySource {
  readonly name = 'greenhouse';

  constructor(config: ConfigService<Env, true>) {
    super(config);
  }

  protected companyConfig(): string {
    return this.config.get('GREENHOUSE_COMPANIES', { infer: true });
  }

  protected async fetchCompany(company: AtsCompany): Promise<RawJob[]> {
    const data = await this.fetchJson<GreenhouseResponse>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.token)}/jobs?content=true`,
    );
    return (data.jobs ?? []).map((job) => this.toRawJob(company, job));
  }

  private toRawJob(company: AtsCompany, job: GreenhouseJob): RawJob {
    // Greenhouse returns `content` as HTML-entity-encoded markup.
    const description = stripHtml(decodeHtmlEntities(job.content ?? ''));
    const location = job.location?.name;
    const remote = /remote|hybrid|מרחוק|היברידי/i.test(location ?? '');
    return {
      externalId: `${company.token}:${job.id}`,
      sourceUrl: job.absolute_url,
      title: job.title,
      company: company.name,
      description: description.slice(0, 6000),
      location,
      city: location,
      isRemote: remote,
      workArrangement: remote ? WorkArrangement.HYBRID : WorkArrangement.ONSITE,
      seniority: inferSeniority(job.title),
      language: LanguageCode.EN,
      technologies: extractTechnologies(`${job.title} ${description}`),
      postedAt: job.updated_at ? new Date(job.updated_at) : undefined,
    };
  }
}
