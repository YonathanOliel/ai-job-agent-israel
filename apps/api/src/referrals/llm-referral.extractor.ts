import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AI_PROVIDER, type AiProvider } from '../ai/ai-provider.types';
import { guessIsraeliCity } from '../jobs/job-source.util';
import { extractedReferralSchema, type ExtractedReferral } from './extracted-referral.schema';
import type { ReferralExtractor } from './referral-extractor.types';

const MAX_INPUT_CHARS = 4000;

const SYSTEM_PROMPT = `You normalize raw job-referral posts from Israeli tech job groups (Hebrew,
English, or mixed, often slang-heavy) into strict JSON. Never invent or embellish information —
if a field is unclear, use null (or an empty array). Do not fabricate a company or location that
is not stated or clearly implied.

Rules:
- "seniority" must be one of STUDENT, JUNIOR, MID, SENIOR, LEAD, MANAGER, DIRECTOR, EXECUTIVE, or null.
- "workArrangement" must be one of REMOTE, HYBRID, ONSITE, or null.
- Hype slang ("תותח", "אלוף", "פצצה") is NOT sufficient on its own to infer seniority — look for
  explicit seniority words or years-of-experience requirements.
- "confidence" (0-1) reflects how sure you are this text is a genuine job posting (not a question,
  a "does anyone know someone" post, or spam).

Return ONLY a single JSON object with keys: jobTitle, company, technologies[], seniority,
workArrangement, location, confidence.`;

/**
 * Uses the configured {@link AiProvider} to normalize a raw referral post,
 * validating the model's JSON output against the canonical schema. Used when
 * REFERRAL_EXTRACTOR=llm; falls back is handled by the DI factory, not here.
 */
@Injectable()
export class LlmReferralExtractor implements ReferralExtractor {
  readonly name = 'llm';

  constructor(@Inject(AI_PROVIDER) private readonly ai: AiProvider) {}

  async extract(text: string): Promise<ExtractedReferral> {
    const raw = await this.ai.complete({
      system: SYSTEM_PROMPT,
      prompt: `Raw referral post:\n${text.slice(0, MAX_INPUT_CHARS)}`,
      json: true,
      temperature: 0,
      maxTokens: 500,
    });

    const parsed = extractedReferralSchema.safeParse(this.parseJson(raw));
    if (!parsed.success) {
      throw new UnprocessableEntityException('AI returned an invalid referral structure');
    }
    // Fall back to a regex-based city guess when the model didn't extract one
    // (still lets a valid Israel-based posting resolve to a structured city).
    if (!parsed.data.location) {
      return { ...parsed.data, location: guessIsraeliCity(text) };
    }
    return parsed.data;
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
      throw new UnprocessableEntityException('AI response was not valid JSON');
    }
  }
}
