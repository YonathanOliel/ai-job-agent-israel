/** Subscription plans and their per-organization entitlements. */
export type PlanKey = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxMembers: number;
  talentSearchesPerMonth: number;
  apiCallsPerMonth: number;
  priceMonthlyUsd: number;
}

export const PLAN_CATALOG: Record<PlanKey, PlanLimits> = {
  free: { maxMembers: 3, talentSearchesPerMonth: 20, apiCallsPerMonth: 1000, priceMonthlyUsd: 0 },
  pro: {
    maxMembers: 15,
    talentSearchesPerMonth: 500,
    apiCallsPerMonth: 50000,
    priceMonthlyUsd: 99,
  },
  enterprise: {
    maxMembers: 1000,
    talentSearchesPerMonth: 100000,
    apiCallsPerMonth: 5000000,
    priceMonthlyUsd: 1500,
  },
};

export const METERED_METRICS = ['talent_search', 'api_call'] as const;
export type MeteredMetric = (typeof METERED_METRICS)[number];

export function isPlanKey(value: string): value is PlanKey {
  return value in PLAN_CATALOG;
}

/** Current billing period key, e.g. "2026-07". */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
