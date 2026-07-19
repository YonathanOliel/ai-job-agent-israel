import { Client } from '@elastic/elasticsearch';
import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

/** DI token for the Elasticsearch client (null when search is not configured). */
export const ELASTICSEARCH_CLIENT = Symbol('ELASTICSEARCH_CLIENT');

/**
 * Provides an Elasticsearch {@link Client} when ELASTICSEARCH_NODE is set,
 * otherwise `null` so the app runs (and search falls back to PostgreSQL)
 * without Elasticsearch.
 */
export const elasticsearchProvider: Provider = {
  provide: ELASTICSEARCH_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): Client | null => {
    const node = config.get('ELASTICSEARCH_NODE', { infer: true });
    if (!node) {
      return null;
    }
    return new Client({ node, requestTimeout: 5000, maxRetries: 2 });
  },
};
