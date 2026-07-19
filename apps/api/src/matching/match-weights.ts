import type { MatchDimensions } from './match-score.types';

/**
 * Overall-score weighting shared by every {@link MatchScorer}. Centralized so
 * the deterministic and semantic scorers stay consistent — a semantic scorer
 * blends individual dimension scores (e.g. experience) but always recomputes
 * the overall with these same weights.
 */
export const OVERALL_WEIGHTS: Record<keyof MatchDimensions, number> = {
  technology: 0.22,
  skill: 0.13,
  experience: 0.2,
  location: 0.1,
  remote: 0.05,
  salary: 0.1,
  industry: 0.05,
  growth: 0.07,
  learningOpportunity: 0.08,
  culture: 0,
  careerProgression: 0,
  interviewProbability: 0,
};

/** Computes the weighted overall score (0–100) from per-dimension scores. */
export function computeWeightedOverall(dimensions: MatchDimensions): number {
  let total = 0;
  for (const key of Object.keys(OVERALL_WEIGHTS) as Array<keyof MatchDimensions>) {
    total += dimensions[key].score * OVERALL_WEIGHTS[key];
  }
  return Math.round(total);
}
