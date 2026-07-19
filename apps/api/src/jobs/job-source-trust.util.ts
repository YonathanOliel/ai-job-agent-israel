/**
 * Trust ranking per source (higher = more authoritative). Used to pick the
 * canonical posting when the same job is seen across multiple sources.
 * Official company ATS boards (direct apply) rank highest; community feeds lowest.
 */
const SOURCE_TRUST: Record<string, number> = {
  greenhouse: 100,
  lever: 100,
  ashby: 100,
  smartrecruiters: 95,
  jooble: 60,
  careerjet: 60,
  jsearch: 55,
  findwork: 50,
  remotive: 40,
  arbeitnow: 40,
  remoteok: 40,
  telegram: 30,
  seed: 10,
};

const DEFAULT_TRUST = 20;

export function sourceTrust(source: string): number {
  return SOURCE_TRUST[source] ?? DEFAULT_TRUST;
}

/** Minimal shape needed to rank duplicates. */
export interface RankableJob {
  id: string;
  source: string;
  description: string;
  postedAt: Date | null;
  lastSeenAt: Date | null;
}

/**
 * Picks the canonical posting from a group of duplicates: most trusted source,
 * then richest description, then most recently posted/seen. Deterministic.
 */
export function pickCanonical<T extends RankableJob>(jobs: T[]): T {
  return [...jobs].sort((a, b) => {
    const trust = sourceTrust(b.source) - sourceTrust(a.source);
    if (trust !== 0) return trust;
    const desc = (b.description?.length ?? 0) - (a.description?.length ?? 0);
    if (desc !== 0) return desc;
    return time(b) - time(a);
  })[0]!;
}

function time(job: RankableJob): number {
  return (job.postedAt ?? job.lastSeenAt ?? new Date(0)).getTime();
}
