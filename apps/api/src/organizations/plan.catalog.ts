/**
 * Plan catalog. The product is currently free for everyone: a single `free`
 * plan with unlimited entitlements (null = unlimited). The structure is kept so
 * paid tiers can be reintroduced later without reworking callers.
 */
export type PlanKey = 'free';

export interface PlanLimits {
  /** null means unlimited. */
  maxMembers: number | null;
  talentSearchesPerMonth: number | null;
  apiCallsPerMonth: number | null;
  priceMonthlyUsd: number;
}

export const PLAN_CATALOG: Record<PlanKey, PlanLimits> = {
  free: {
    maxMembers: null,
    talentSearchesPerMonth: null,
    apiCallsPerMonth: null,
    priceMonthlyUsd: 0,
  },
};

export const DEFAULT_PLAN: PlanKey = 'free';

export const METERED_METRICS = ['talent_search', 'api_call'] as const;
export type MeteredMetric = (typeof METERED_METRICS)[number];

export function isPlanKey(value: string): value is PlanKey {
  return value in PLAN_CATALOG;
}

/** Current usage period key, e.g. "2026-07". */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
