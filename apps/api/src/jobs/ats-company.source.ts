import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { JobSource, RawJob } from './job-source.types';
import { isIsraelLocation, isTechRole } from './job-source.util';

const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AiJobAgentIsrael/1.0)';

/** A company reachable on a public ATS job board. */
export interface AtsCompany {
  /** The ATS board token/slug (e.g. Greenhouse board name). */
  token: string;
  /** Human-friendly company name shown to users. */
  name: string;
}

/**
 * Base for job sources backed by public ATS job-board APIs (Greenhouse, Lever,
 * Ashby, …). Each aggregates the officially-public boards of the companies
 * configured for it. Only Israel-located technology roles are kept, honoring
 * the Israel-only mandate. These APIs are public and key-free — no scraping.
 */
export abstract class AtsCompanySource implements JobSource {
  abstract readonly name: string;
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly config: ConfigService<Env, true>) {}

  /** Raw comma-separated company configuration for this ATS. */
  protected abstract companyConfig(): string;
  /** Fetch and map one company's postings to normalized jobs. */
  protected abstract fetchCompany(company: AtsCompany): Promise<RawJob[]>;

  async fetchJobs(): Promise<RawJob[]> {
    const companies = this.parseCompanies(this.companyConfig());
    if (companies.length === 0) {
      return [];
    }
    const limit = this.config.get('JOB_INGEST_LIMIT', { infer: true });

    const jobs: RawJob[] = [];
    for (const company of companies) {
      try {
        for (const job of await this.fetchCompany(company)) {
          if (this.accept(job)) {
            jobs.push(job);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to read ${this.name} board "${company.token}": ${(error as Error).message}`,
        );
      }
    }
    return jobs.slice(0, limit);
  }

  /** Keep only Israel-located technology roles. */
  protected accept(job: RawJob): boolean {
    return isIsraelLocation(job.location ?? job.city ?? '') && isTechRole(job.title);
  }

  protected parseCompanies(raw: string): AtsCompany[] {
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [token, ...name] = entry.split('|');
        const slug = token.trim();
        return { token: slug, name: name.join('|').trim() || this.prettify(slug) };
      });
  }

  protected async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`responded with ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private prettify(token: string): string {
    return token
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
}
