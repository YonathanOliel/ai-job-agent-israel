import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CareerProfile, Job } from '@prisma/client';
import { AI_PROVIDER, AiProviderError, type AiProvider } from '../ai/ai-provider.types';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { matchInsightSchema, type MatchInsight } from './match-insight.types';
import type { MatchResult } from './match-score.types';

const SYSTEM_PROMPT = `You are a warm, direct Israeli career advisor. You are given a candidate's
profile, a job, and a precomputed match breakdown. Write a short, personal explanation in natural
Hebrew (not robotic, no buzzwords). Rules:
- "whyYouFit": 1-2 sentences on the strongest, most specific reasons this role fits the candidate.
- "whatYouMiss": 1 sentence on the most important gap or something worth strengthening. If there is
  no meaningful gap, say so honestly and briefly.
- Never invent skills or experience the candidate does not have. Base everything on the data given.
Return ONLY a JSON object: {"whyYouFit": string, "whatYouMiss": string}.`;

/**
 * LLM reranking / reasoning layer (blueprint pillar 3). Turns the numeric match
 * breakdown into a personalized, human-readable explanation on demand. Optional:
 * requires a configured AI provider — callers should check {@link enabled} (or
 * handle {@link ServiceUnavailableException}) so matching still works without a key.
 */
@Injectable()
export class MatchInsightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  /** Whether the configured AI provider has an API key and can generate insights. */
  get enabled(): boolean {
    const provider = this.config.get('AI_DEFAULT_PROVIDER', { infer: true });
    const key =
      provider === 'anthropic'
        ? this.config.get('ANTHROPIC_API_KEY', { infer: true })
        : provider === 'gemini'
          ? this.config.get('GEMINI_API_KEY', { infer: true })
          : this.config.get('OPENAI_API_KEY', { infer: true });
    return Boolean(key);
  }

  async explain(userId: string, jobId: string): Promise<MatchInsight> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI insights are not enabled on this server');
    }

    const match = await this.prisma.jobMatch.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: { job: true },
    });
    if (!match) {
      throw new ServiceUnavailableException('Match not found');
    }
    const profile = await this.prisma.careerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ServiceUnavailableException('No career profile found');
    }

    const scores = match.scores as unknown as MatchResult;
    const prompt = this.buildPrompt(profile, match.job, match.overallScore, scores);

    let raw: string;
    try {
      raw = await this.ai.complete({
        system: SYSTEM_PROMPT,
        prompt,
        json: true,
        temperature: 0.3,
        maxTokens: 400,
      });
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw new ServiceUnavailableException('AI insight generation failed');
      }
      throw error;
    }

    const parsed = matchInsightSchema.safeParse(this.parseJson(raw));
    if (!parsed.success) {
      throw new ServiceUnavailableException('AI returned an invalid insight');
    }
    return { ...parsed.data, provider: this.ai.name };
  }

  private buildPrompt(
    profile: CareerProfile,
    job: Job,
    overallScore: number,
    scores: MatchResult,
  ): string {
    const missing = scores.missingSkills?.slice(0, 8).join(', ') || 'none';
    const dims = scores.dimensions
      ? Object.entries(scores.dimensions)
          .map(([key, dim]) => `${key}: ${dim.score}`)
          .join(', ')
      : '';

    return [
      `Overall match score: ${overallScore}/100`,
      `Dimension scores: ${dims}`,
      `Missing/weak skills: ${missing}`,
      '',
      'Candidate profile:',
      `- Headline: ${profile.headline ?? '—'}`,
      `- Seniority: ${profile.seniority ?? '—'}`,
      `- Years of experience: ${profile.yearsExperience ?? '—'}`,
      `- Technologies: ${profile.technologies.join(', ') || '—'}`,
      `- Skills: ${profile.skills.join(', ') || '—'}`,
      '',
      'Job:',
      `- Title: ${job.title}`,
      `- Company: ${job.company}`,
      `- Seniority: ${job.seniority ?? '—'}`,
      `- Technologies: ${job.technologies.join(', ') || '—'}`,
      `- Location: ${job.city ?? job.location ?? '—'}`,
    ].join('\n');
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}
