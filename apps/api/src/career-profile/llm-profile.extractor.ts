import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { LanguageCode } from '@prisma/client';
import { AI_PROVIDER, type AiProvider } from '../ai/ai-provider.types';
import { structuredProfileSchema, type StructuredProfile } from './structured-profile.schema';

const MAX_INPUT_CHARS = 12000;

const SYSTEM_PROMPT = `You are an expert technical recruiter operating in the Israeli job market.
Extract a structured profile from the resume text. Rules:
- Never invent or embellish information. Use empty arrays or omit fields when unknown.
- "seniority" must be one of: STUDENT, JUNIOR, MID, SENIOR, LEAD, MANAGER, DIRECTOR, EXECUTIVE.
- "yearsExperience" is a number.
- Recognize Israeli locations and companies.
- Keep free-text fields (headline, summary, descriptions) in the resume's original language.
Return ONLY a single JSON object with keys: headline, summary, yearsExperience, seniority,
desiredRoles[], skills[], technologies[], industries[], preferredLocations[],
languages[{name, proficiency}], education[{institution, degree, field, year}],
experience[{company, title, startDate, endDate, description}], certifications[],
projects[{name, description}].`;

/**
 * Uses the configured {@link AiProvider} to extract a rich structured profile,
 * validating the model's JSON output against the canonical schema.
 */
@Injectable()
export class LlmProfileExtractor {
  readonly name = 'llm';

  constructor(@Inject(AI_PROVIDER) private readonly ai: AiProvider) {}

  async extract(text: string, language: LanguageCode): Promise<StructuredProfile> {
    const prompt = `Resume language: ${language}\n\nResume text:\n${text.slice(0, MAX_INPUT_CHARS)}`;
    const raw = await this.ai.complete({
      system: SYSTEM_PROMPT,
      prompt,
      json: true,
      temperature: 0,
      maxTokens: 2000,
    });

    const parsed = structuredProfileSchema.safeParse(this.parseJson(raw));
    if (!parsed.success) {
      throw new UnprocessableEntityException('AI returned an invalid profile structure');
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
