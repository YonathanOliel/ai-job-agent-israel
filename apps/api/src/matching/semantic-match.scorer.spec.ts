import type { CareerProfile, Job } from '@prisma/client';
import type { EmbeddingService } from '../embeddings/embedding.service';
import type { DeterministicMatchScorer } from './deterministic-match.scorer';
import type { MatchResult } from './match-score.types';
import { SemanticMatchScorer } from './semantic-match.scorer';

const dimension = (score: number, explanation = '') => ({ score, explanation });

const baseResult: MatchResult = {
  overall: 55,
  confidence: dimension(70),
  dimensions: {
    experience: dimension(50, 'Deterministic experience note.'),
    skill: dimension(60),
    technology: dimension(60),
    industry: dimension(50),
    culture: dimension(50),
    growth: dimension(50),
    salary: dimension(60),
    location: dimension(70),
    remote: dimension(70),
    careerProgression: dimension(50),
    learningOpportunity: dimension(50),
    interviewProbability: dimension(55),
  },
  strengths: [],
  weaknesses: [],
  missingSkills: [],
};

const profile = { userId: 'u1', technologies: ['react', 'typescript'] } as unknown as CareerProfile;
const job = {
  id: 'j1',
  technologies: ['react', 'typescript', 'graphql', 'node.js'],
} as unknown as Job;

describe('SemanticMatchScorer', () => {
  let deterministic: jest.Mocked<DeterministicMatchScorer>;
  let embeddings: jest.Mocked<EmbeddingService>;
  let scorer: SemanticMatchScorer;

  beforeEach(() => {
    deterministic = {
      name: 'deterministic',
      score: jest.fn().mockResolvedValue(structuredClone(baseResult)),
    } as unknown as jest.Mocked<DeterministicMatchScorer>;
    embeddings = {
      enabled: true,
      similarity: jest.fn(),
    } as unknown as jest.Mocked<EmbeddingService>;
    scorer = new SemanticMatchScorer(deterministic, embeddings);
  });

  it('returns the deterministic result unchanged when embeddings are disabled', async () => {
    Object.defineProperty(embeddings, 'enabled', { value: false });

    const result = await scorer.score(profile, job);

    expect(result).toEqual(baseResult);
    expect(embeddings.similarity).not.toHaveBeenCalled();
  });

  it('returns the deterministic result unchanged when no similarity is available', async () => {
    embeddings.similarity.mockResolvedValue(null);

    const result = await scorer.score(profile, job);

    expect(result).toEqual(baseResult);
  });

  it('blends semantic similarity into the experience dimension and recomputes overall', async () => {
    embeddings.similarity.mockResolvedValue(0.9);

    const result = await scorer.score(profile, job);

    // blended = 50*0.4 + 90*0.6 = 74
    expect(result.dimensions.experience.score).toBe(74);
    expect(result.dimensions.experience.explanation).toContain('Semantic alignment');
    expect(result.overall).not.toBe(baseResult.overall);
  });

  it('applies the hard-requirement gate when critical tech coverage is low', async () => {
    embeddings.similarity.mockResolvedValue(0.9);
    const poorMatchJob = {
      id: 'j2',
      technologies: ['rust', 'go', 'kafka', 'kubernetes'],
    } as unknown as Job;

    const result = await scorer.score(profile, poorMatchJob);

    // Weighted overall pre-gate is 62 (see the "does not gate" test below for
    // the same blended dimensions); 0/4 required techs match (0% < 34%
    // threshold), so the 0.7x penalty applies: round(62 * 0.7) = 43.
    expect(result.overall).toBe(43);
  });

  it('does not gate when tech coverage is adequate', async () => {
    embeddings.similarity.mockResolvedValue(0.9);

    const result = await scorer.score(profile, job); // 2/4 = 50% coverage, above 34% threshold

    // technology(60)*0.22 + skill(60)*0.13 + experience(74)*0.2 + location(70)*0.1
    // + remote(70)*0.05 + salary(60)*0.1 + industry(50)*0.05 + growth(50)*0.07
    // + learning(50)*0.08 = 62 (culture/careerProgression/interview weigh 0).
    expect(result.overall).toBe(62);
  });
});
