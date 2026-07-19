import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType, LanguageCode, WorkArrangement } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { AtsCompanySource, type AtsCompany } from './ats-company.source';
import type { RawJob } from './job-source.types';
import { extractTechnologies, inferSeniority, stripHtml } from './job-source.util';

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  description?: string;
  workplaceType?: string;
  createdAt?: number;
  categories?: { location?: string; commitment?: string };
}

/**
 * Real Israeli jobs from company boards on Lever's public API (no key):
 * https://api.lever.co/v0/postings/{token}?mode=json
 */
@Injectable()
export class LeverJobSource extends AtsCompanySource {
  readonly name = 'lever';

  constructor(config: ConfigService<Env, true>) {
    super(config);
  }

  protected companyConfig(): string {
    return this.config.get('LEVER_COMPANIES', { infer: true });
  }

  protected async fetchCompany(company: AtsCompany): Promise<RawJob[]> {
    const postings = await this.fetchJson<LeverPosting[]>(
      `https://api.lever.co/v0/postings/${encodeURIComponent(company.token)}?mode=json`,
    );
    return (postings ?? []).map((posting) => this.toRawJob(company, posting));
  }

  private toRawJob(company: AtsCompany, posting: LeverPosting): RawJob {
    const location = posting.categories?.location;
    const description = posting.descriptionPlain ?? stripHtml(posting.description ?? '');
    const remote = /remote|מרחוק/i.test(`${posting.workplaceType ?? ''} ${location ?? ''}`);
    return {
      externalId: `${company.token}:${posting.id}`,
      sourceUrl: posting.hostedUrl ?? posting.applyUrl,
      title: posting.text,
      company: company.name,
      description: description.slice(0, 6000),
      location,
      city: location,
      isRemote: remote,
      workArrangement: remote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE,
      employmentType: this.mapCommitment(posting.categories?.commitment),
      seniority: inferSeniority(posting.text),
      language: LanguageCode.EN,
      technologies: extractTechnologies(`${posting.text} ${description}`),
      postedAt: posting.createdAt ? new Date(posting.createdAt) : undefined,
    };
  }

  private mapCommitment(commitment?: string): EmploymentType | undefined {
    const value = (commitment ?? '').toLowerCase();
    if (/intern/.test(value)) return EmploymentType.INTERNSHIP;
    if (/part/.test(value)) return EmploymentType.PART_TIME;
    if (/contract|temp|freelance/.test(value)) return EmploymentType.CONTRACT;
    if (/full/.test(value)) return EmploymentType.FULL_TIME;
    return undefined;
  }
}
