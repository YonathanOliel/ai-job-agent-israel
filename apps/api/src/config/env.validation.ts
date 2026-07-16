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
