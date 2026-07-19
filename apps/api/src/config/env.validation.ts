import { z } from 'zod';

/**
 * Environment schema for the API. Validated once at startup so the rest of the
 * app can rely on typed, present configuration values.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  // Comma-separated allowed CORS origins for the web client. If unset, the API
  // reflects the request origin (development convenience).
  CORS_ORIGINS: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  // Access-token lifetime in seconds (default 15 minutes).
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  // Refresh-token lifetime in seconds (default 14 days).
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1209600),
  // Object storage (S3-compatible, e.g. MinIO).
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().min(1).default('il-central-1'),
  STORAGE_BUCKET: z.string().min(1).default('resumes'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  // Maximum accepted resume upload size in bytes (default 10 MiB).
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  // AI providers (provider abstraction). Keys are optional so the app boots
  // without them; a provider only fails when actually invoked without a key.
  AI_DEFAULT_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Career-profile extraction strategy. "heuristic" works offline (no API key);
  // "llm" uses the configured AI provider for richer extraction.
  PROFILE_EXTRACTOR: z.enum(['heuristic', 'llm']).default('heuristic'),
  // Real job source (Remotive public API — no key, returns real apply links).
  REMOTIVE_API_URL: z.string().url().default('https://remotive.com/api/remote-jobs'),
  REMOTIVE_CATEGORY: z.string().default('software-dev'),
  // Jooble job source — real Israeli listings. Requires a free API key.
  // When JOOBLE_API_KEY is set, the source is enabled automatically.
  JOOBLE_API_URL: z.string().url().default('https://jooble.org/api'),
  JOOBLE_API_KEY: z.string().optional(),
  JOOBLE_LOCATION: z.string().default('Israel'),
  JOOBLE_KEYWORDS: z.string().default(''),
  // Public Telegram job channels to read (comma-separated usernames, no @).
  // Uses Telegram's public web preview (t.me/s/<channel>) — no key needed.
  TELEGRAM_CHANNELS: z.string().default(''),
  // Public ATS job-board APIs (no key). Comma-separated company tokens; each
  // entry may be "token" or "token|Display Name". Israel-located tech roles
  // from these companies' official public boards are ingested.
  GREENHOUSE_COMPANIES: z.string().default(''),
  LEVER_COMPANIES: z.string().default(''),
  ASHBY_COMPANIES: z.string().default(''),
  // JSearch (Google-for-Jobs aggregator via RapidAPI). Enabled when RAPIDAPI_KEY
  // is set. Broad Israeli coverage incl. LinkedIn/Indeed-sourced postings.
  RAPIDAPI_KEY: z.string().optional(),
  JSEARCH_HOST: z.string().default('jsearch.p.rapidapi.com'),
  JSEARCH_QUERY: z.string().default('software developer jobs in israel'),
  // Careerjet public API. Enabled when CAREERJET_AFFID (free affiliate id) is set.
  CAREERJET_AFFID: z.string().optional(),
  CAREERJET_KEYWORDS: z.string().default('developer'),
  CAREERJET_LOCATION: z.string().default('Israel'),
  // Findwork.dev API. Enabled when FINDWORK_API_KEY is set.
  FINDWORK_API_KEY: z.string().optional(),
  FINDWORK_SEARCH: z.string().default('developer'),
  // Elasticsearch — full-text job search. When ELASTICSEARCH_NODE is set the
  // search endpoint is served by Elasticsearch (relevance + fuzzy); otherwise
  // it falls back to PostgreSQL. No regression when unset.
  ELASTICSEARCH_NODE: z.string().optional(),
  ELASTICSEARCH_INDEX: z.string().default('jobs'),
  // Max jobs to ingest per source per run.
  JOB_INGEST_LIMIT: z.coerce.number().int().positive().max(200).default(50),
  // Include the built-in sample jobs alongside real sources (dev/testing).
  ENABLE_SEED_JOBS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates `process.env`. Throws a readable error listing every
 * invalid/missing variable so misconfiguration fails fast at boot.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}
