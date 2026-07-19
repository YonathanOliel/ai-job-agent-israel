import { Injectable } from '@nestjs/common';
import { CareerProfile, Job } from '@prisma/client';
import { EmbeddingService } from '../embeddings/embedding.service';
import { computeWeightedOverall } from './match-weights';
import type { MatchDimensions, MatchResult, MatchScorer } from './match-score.types';
import { DeterministicMatchScorer } from './deterministic-match.scorer';

/** Weight given to the semantic signal when blending into the experience dimension. */
const SEMANTIC_BLEND_WEIGHT = 0.6;

/** Minimum required-technology overlap below which the hard-requirement gate applies. */
const CRITICAL_TECH_THRESHOLD = 0.34;

/** Multiplier applied to the overall score when critical tech coverage is low. */
const CRITICAL_TECH_PENALTY = 0.7;

/**
 * Semantic match scorer: decorates {@link DeterministicMatchScorer} with a
 * pgvector cosine-similarity signal (Semantic Experience Alignment) and a
 * hard-requirement gate on missing core technologies.
 *
 * Degrades to the exact deterministic result — zero regression — whenever
 * embeddings are disabled (no OPENAI_API_KEY) or unavailable for this
 * profile/job pair (not yet computed). Semantic scoring only ever *adds*
 * signal; it never runs when there is nothing to add.
 */
@Injectable()
export class SemanticMatchScorer implements MatchScorer {
  readonly name = 'semantic';

  constructor(
    private readonly deterministic: DeterministicMatchScorer,
    private readonly embeddings: EmbeddingService,
  ) {}

  async score(profile: CareerProfile, job: Job): Promise<MatchResult> {
    const base = await this.deterministic.score(profile, job);
    if (!this.embeddings.enabled) {
      return base;
    }

    const similarity = await this.embeddings.similarity(job.id, profile.userId);
    if (similarity === null) {
      return base;
    }

    const semanticScore = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
    const blendedExperienceScore = Math.round(
      base.dimensions.experience.score * (1 - SEMANTIC_BLEND_WEIGHT) +
        semanticScore * SEMANTIC_BLEND_WEIGHT,
    );

    const dimensions: MatchDimensions = {
      ...base.dimensions,
      experience: {
        score: blendedExperienceScore,
        explanation: `${base.dimensions.experience.explanation} Semantic alignment with your full profile: ${semanticScore}/100.`,
      },
    };

    let overall = computeWeightedOverall(dimensions);

    // Hard-requirement gate: a job with several required technologies where the
    // candidate matches too few of them is not "almost a fit" — cap the overall
    // score even if other dimensions score well.
    const requiredTech = job.technologies;
    if (requiredTech.length >= 3) {
      const have = new Set(profile.technologies.map((t) => t.trim().toLowerCase()));
      const matched = requiredTech.filter((t) => have.has(t.trim().toLowerCase())).length;
      const coverage = matched / requiredTech.length;
      if (coverage < CRITICAL_TECH_THRESHOLD) {
        overall = Math.round(overall * CRITICAL_TECH_PENALTY);
      }
    }

    return { ...base, dimensions, overall };
  }
}
