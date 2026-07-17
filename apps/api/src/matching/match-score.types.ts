import type { CareerProfile, Job } from '@prisma/client';

/** DI token for the active {@link MatchScorer} implementation. */
export const MATCH_SCORER = Symbol('MATCH_SCORER');

/** A single scored dimension with a human-readable explanation. */
export interface DimensionScore {
  /** 0–100. */
  score: number;
  explanation: string;
}

export interface MatchDimensions {
  experience: DimensionScore;
  skill: DimensionScore;
  technology: DimensionScore;
  industry: DimensionScore;
  culture: DimensionScore;
  growth: DimensionScore;
  salary: DimensionScore;
  location: DimensionScore;
  remote: DimensionScore;
  careerProgression: DimensionScore;
  learningOpportunity: DimensionScore;
  interviewProbability: DimensionScore;
}

/** Full explainable match result for a single job against a profile. */
export interface MatchResult {
  /** Weighted overall score, 0–100. */
  overall: number;
  confidence: DimensionScore;
  dimensions: MatchDimensions;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
}

/**
 * Scores how well a job fits a candidate's career profile. Implementations may
 * be deterministic, embedding-based, or LLM-driven — all behind this interface.
 */
export interface MatchScorer {
  readonly name: string;
  score(profile: CareerProfile, job: Job): MatchResult;
}
