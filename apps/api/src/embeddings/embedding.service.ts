import { Inject, Injectable, Logger } from '@nestjs/common';
import { CareerProfile, Job, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from '../ai/embedding-provider.types';
import { buildJobEmbeddingText, buildProfileEmbeddingText } from './embedding-text.util';

/**
 * Computes and persists pgvector embeddings for jobs and career profiles, and
 * computes cosine similarity between a job and a profile. Every method is a
 * safe no-op when no embedding provider is configured (no OPENAI_API_KEY):
 * the semantic matching engine then degrades to the deterministic scorer with
 * zero regression. Failures are logged and swallowed — embeddings are always
 * best-effort and must never break ingestion, profile generation, or matching.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PROVIDER) private readonly provider: EmbeddingProvider | null,
  ) {}

  /** Whether an embedding provider is configured. */
  get enabled(): boolean {
    return this.provider !== null;
  }

  /** Embeds and persists a job's vector. Best-effort; never throws. */
  async embedJob(job: Job): Promise<void> {
    if (!this.provider) {
      return;
    }
    try {
      const text = buildJobEmbeddingText(job);
      if (!text.trim()) {
        return;
      }
      const vector = await this.provider.embed(text);
      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE "jobs" SET embedding = ${this.toVectorLiteral(vector)}::vector WHERE id = ${job.id}::uuid`,
      );
    } catch (error) {
      this.logger.warn(`Failed to embed job ${job.id}: ${(error as Error).message}`);
    }
  }

  /** Embeds and persists a career profile's vector. Best-effort; never throws. */
  async embedProfile(profile: CareerProfile): Promise<void> {
    if (!this.provider) {
      return;
    }
    try {
      const text = buildProfileEmbeddingText(profile);
      if (!text.trim()) {
        return;
      }
      const vector = await this.provider.embed(text);
      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE "career_profiles" SET embedding = ${this.toVectorLiteral(vector)}::vector WHERE id = ${profile.id}::uuid`,
      );
    } catch (error) {
      this.logger.warn(`Failed to embed career profile ${profile.id}: ${(error as Error).message}`);
    }
  }

  /**
   * Cosine similarity (0–1, higher is more similar) between a job's and a
   * profile's embeddings. Returns `null` when disabled, either embedding is
   * missing, or the query fails — callers must treat that as "no semantic
   * signal available" and fall back to deterministic scoring.
   */
  async similarity(jobId: string, profileUserId: string): Promise<number | null> {
    if (!this.provider) {
      return null;
    }
    try {
      const rows = await this.prisma.$queryRaw<Array<{ similarity: number | null }>>(
        Prisma.sql`
          SELECT 1 - (j.embedding <=> p.embedding) AS similarity
          FROM "jobs" j, "career_profiles" p
          WHERE j.id = ${jobId}::uuid
            AND p."userId" = ${profileUserId}::uuid
            AND j.embedding IS NOT NULL
            AND p.embedding IS NOT NULL
        `,
      );
      const similarity = rows[0]?.similarity;
      return typeof similarity === 'number' ? similarity : null;
    } catch (error) {
      this.logger.warn(
        `Failed to compute similarity for job ${jobId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /** Formats a numeric vector as a pgvector input literal, e.g. "[0.1,0.2]". */
  private toVectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }
}
