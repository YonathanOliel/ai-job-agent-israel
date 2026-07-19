import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType, LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { AtsCompanySource, type AtsCompany } from './ats-company.source';
import { CompanyRegistryService } from './company-registry.service';
import type { RawJob } from './job-source.types';
import { extractTechnologies, inferSeniority, stripHtml } from './job-source.util';

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  isRemote?: boolean;
  employmentType?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  publishedAt?: string;
}

interface AshbyResponse {
  jobs?: AshbyJob[];
}

/**
 * Real Israeli jobs from company boards on Ashby's public API (no key):
 * https://api.ashbyhq.com/posting-api/job-board/{token}
 */
@Injectable()
export class AshbyJobSource extends AtsCompanySource {
  readonly name = 'ashby';

  constructor(config: ConfigService<Env, true>, companies: CompanyRegistryService) {
    super(config, companies);
  }

  protected companyConfig(): string {
    return this.config.get('ASHBY_COMPANIES', { infer: true });
  }

  protected async fetchCompany(company: AtsCompany): Promise<RawJob[]> {
    const data = await this.fetchJson<AshbyResponse>(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.token)}`,
    );
    return (data.jobs ?? []).map((job) => this.toRawJob(company, job));
  }

  private toRawJob(company: AtsCompany, job: AshbyJob): RawJob {
    const description = job.descriptionPlain ?? stripHtml(job.descriptionHtml ?? '');
    return {
      externalId: `${company.token}:${job.id}`,
      sourceUrl: job.jobUrl ?? job.applyUrl,
      title: job.title,
      company: company.name,
      description: description.slice(0, 6000),
      location: job.location,
      city: job.location,
      isRemote: Boolean(job.isRemote),
      workArrangement: job.isRemote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      employmentType: this.mapEmployment(job.employmentType),
      seniority: inferSeniority(job.title),
      language: LanguageCode.EN,
      technologies: extractTechnologies(`${job.title} ${description}`),
      postedAt: job.publishedAt ? new Date(job.publishedAt) : undefined,
    };
  }

  private mapEmployment(type?: string): EmploymentType | undefined {
    const value = (type ?? '').toLowerCase();
    if (/intern/.test(value)) return EmploymentType.INTERNSHIP;
    if (/part/.test(value)) return EmploymentType.PART_TIME;
    if (/contract|temp|freelance/.test(value)) return EmploymentType.CONTRACT;
    if (/full/.test(value)) return EmploymentType.FULL_TIME;
    return undefined;
  }
}
