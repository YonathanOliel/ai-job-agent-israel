-- Enable pgvector (already present in the pgvector/pgvector:pg16 image, but
-- explicit here so the migration is reproducible on any Postgres instance).
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "career_profiles" ADD COLUMN     "embedding" vector(1536);

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "embedding" vector(1536);

-- Approximate nearest-neighbor index for semantic job search/matching
-- (cosine distance). Jobs with a NULL embedding are simply excluded.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw (embedding vector_cosine_ops);
