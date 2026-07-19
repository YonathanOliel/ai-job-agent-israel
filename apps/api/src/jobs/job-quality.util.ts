import { sourceTrust } from './job-source-trust.util';

/** Inputs needed to score a posting's quality. */
export interface QualityInput {
  source: string;
  description?: string;
  sourceUrl?: string;
  city?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  technologies?: string[];
  seniority?: string | null;
  employmentType?: string | null;
  postedAt?: Date;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Composite 0–100 quality score combining source trust, completeness of the
 * posting, and freshness. Deterministic; higher is better. Lets the platform
 * rank and surface the richest, most authoritative, most recent postings.
 */
export function computeQualityScore(job: QualityInput, now: Date = new Date()): number {
  // Trust (0–40): normalized source authority.
  const trust = (Math.min(sourceTrust(job.source), 100) / 100) * 40;

  // Completeness (0–40): share of key fields present.
  const checks = [
    (job.description?.length ?? 0) >= 200,
    Boolean(job.sourceUrl),
    Boolean(job.city ?? job.location),
    Boolean(job.salaryMin ?? job.salaryMax),
    (job.technologies?.length ?? 0) > 0,
    Boolean(job.seniority),
    Boolean(job.employmentType),
  ];
  const completeness = (checks.filter(Boolean).length / checks.length) * 40;

  // Freshness (0–20): recency of the posting.
  const freshness = freshnessScore(job.postedAt, now);

  return Math.round(trust + completeness + freshness);
}

function freshnessScore(postedAt: Date | undefined, now: Date): number {
  if (!postedAt) {
    return 8;
  }
  const ageDays = (now.getTime() - postedAt.getTime()) / DAY;
  if (ageDays <= 3) return 20;
  if (ageDays <= 7) return 15;
  if (ageDays <= 30) return 8;
  return 3;
}
