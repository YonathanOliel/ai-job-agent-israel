import type { Client, estypes } from '@elastic/elasticsearch';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.provider';

/** Query parameters accepted by the search backend. */
export interface JobSearchQuery {
  page: number;
  pageSize: number;
  search?: string;
  city?: string;
  isRemote?: boolean;
  seniority?: string;
  workArrangement?: string;
  employmentType?: string;
  technology?: string;
}

export interface JobSearchResult {
  ids: string[];
  total: number;
}

const INDEX_MAPPINGS: estypes.MappingTypeMapping = {
  properties: {
    title: { type: 'text', fields: { kw: { type: 'keyword' } } },
    company: { type: 'text', fields: { kw: { type: 'keyword' } } },
    description: { type: 'text' },
    city: { type: 'text', fields: { kw: { type: 'keyword' } } },
    isRemote: { type: 'boolean' },
    seniority: { type: 'keyword' },
    workArrangement: { type: 'keyword' },
    employmentType: { type: 'keyword' },
    technologies: { type: 'keyword' },
    status: { type: 'keyword' },
    postedAt: { type: 'date' },
  },
};

/**
 * Elasticsearch-backed job search: relevance ranking, fuzzy matching and
 * facet-style filters. Degrades gracefully — every method is a no-op when
 * Elasticsearch is not configured (client is null), and callers fall back to
 * PostgreSQL.
 */
@Injectable()
export class JobSearchService implements OnModuleInit {
  private readonly logger = new Logger(JobSearchService.name);
  private readonly indexName: string;
  private indexReady = false;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client | null,
    config: ConfigService<Env, true>,
  ) {
    this.indexName = config.get('ELASTICSEARCH_INDEX', { infer: true });
  }

  /** Whether Elasticsearch is configured and should serve search. */
  get enabled(): boolean {
    return this.client !== null;
  }

  /** Liveness check of the search backend; false when disabled or unreachable. */
  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.ensureIndex();
    } catch (error) {
      // Elasticsearch may not be ready yet at boot; index is created lazily.
      this.logger.warn(`Elasticsearch not ready at startup: ${(error as Error).message}`);
    }
  }

  async ensureIndex(): Promise<void> {
    if (!this.client || this.indexReady) {
      return;
    }
    const exists = await this.client.indices.exists({ index: this.indexName });
    if (!exists) {
      await this.client.indices.create({ index: this.indexName, mappings: INDEX_MAPPINGS });
    }
    this.indexReady = true;
  }

  /** Best-effort indexing of a single job; never throws. */
  async index(job: Job): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.ensureIndex();
      await this.client.index({
        index: this.indexName,
        id: job.id,
        document: this.toDocument(job),
      });
    } catch (error) {
      this.logger.warn(`Failed to index job ${job.id}: ${(error as Error).message}`);
    }
  }

  /** Bulk (re)index a set of jobs. Returns the number of indexed documents. */
  async bulkIndex(jobs: Job[]): Promise<number> {
    if (!this.client || jobs.length === 0) {
      return 0;
    }
    await this.ensureIndex();
    const operations = jobs.flatMap((job) => [
      { index: { _index: this.indexName, _id: job.id } },
      this.toDocument(job),
    ]);
    const response = await this.client.bulk({ operations, refresh: true });
    if (response.errors) {
      const failed = response.items.filter((item) => item.index?.error).length;
      this.logger.warn(`Bulk index completed with ${failed} failures`);
    }
    return jobs.length;
  }

  async search(query: JobSearchQuery): Promise<JobSearchResult> {
    if (!this.client) {
      return { ids: [], total: 0 };
    }
    const filter: estypes.QueryDslQueryContainer[] = [{ term: { status: 'ACTIVE' } }];
    const must: estypes.QueryDslQueryContainer[] = [];

    if (query.search) {
      must.push({
        multi_match: {
          query: query.search,
          fields: ['title^3', 'company^2', 'technologies^2', 'description'],
          fuzziness: 'AUTO',
          type: 'best_fields',
        },
      });
    }
    if (query.city) {
      filter.push({ match: { city: query.city } });
    }
    if (query.isRemote !== undefined) {
      filter.push({ term: { isRemote: query.isRemote } });
    }
    if (query.seniority) {
      filter.push({ term: { seniority: query.seniority } });
    }
    if (query.workArrangement) {
      filter.push({ term: { workArrangement: query.workArrangement } });
    }
    if (query.employmentType) {
      filter.push({ term: { employmentType: query.employmentType } });
    }
    if (query.technology) {
      filter.push({ term: { technologies: query.technology.toLowerCase() } });
    }

    const sort: estypes.Sort = query.search
      ? ['_score', { postedAt: { order: 'desc' } }]
      : [{ postedAt: { order: 'desc' } }];

    const response = await this.client.search({
      index: this.indexName,
      from: (query.page - 1) * query.pageSize,
      size: query.pageSize,
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      sort,
      _source: false,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value ?? 0);
    return { ids: response.hits.hits.map((hit) => hit._id as string), total };
  }

  private toDocument(job: Job): Record<string, unknown> {
    return {
      title: job.title,
      company: job.company,
      description: job.description,
      city: job.city,
      isRemote: job.isRemote,
      seniority: job.seniority,
      workArrangement: job.workArrangement,
      employmentType: job.employmentType,
      technologies: job.technologies,
      status: job.status,
      postedAt: job.postedAt,
    };
  }
}
