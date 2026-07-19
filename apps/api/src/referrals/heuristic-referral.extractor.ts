import { Injectable } from '@nestjs/common';
import { SeniorityLevel, WorkArrangement } from '@prisma/client';
import { extractTechnologies, guessIsraeliCity, isTechRole } from '../jobs/job-source.util';
import { extractedReferralSchema, type ExtractedReferral } from './extracted-referral.schema';
import type { ReferralExtractor } from './referral-extractor.types';

const SENIORITY_KEYWORDS: Array<{ level: SeniorityLevel; terms: string[] }> = [
  { level: SeniorityLevel.MANAGER, terms: ['manager', 'מנהל'] },
  { level: SeniorityLevel.LEAD, terms: ['team lead', 'tech lead', 'ראש צוות', 'טים ליד'] },
  { level: SeniorityLevel.SENIOR, terms: ['senior', 'סניור', 'סיניור', 'בכיר'] },
  {
    level: SeniorityLevel.JUNIOR,
    terms: ['junior', 'ג׳וניור', 'ג׳וניורית', 'זוטר', 'entry level'],
  },
  { level: SeniorityLevel.STUDENT, terms: ['student', 'סטודנט', 'intern', 'מתמחה'] },
];

const REMOTE_TERMS = ['remote', 'מהבית', 'עבודה מרחוק', 'רימוט'];
const HYBRID_TERMS = ['hybrid', 'היברידי', 'היברידית'];
const ONSITE_TERMS = ['onsite', 'on-site', 'במשרד', 'פרונטלי'];

/** Ambiguous hype words ("תותח"/"אלוף") never determine seniority on their own. */
function detectSeniority(lower: string): SeniorityLevel | null {
  for (const { level, terms } of SENIORITY_KEYWORDS) {
    if (terms.some((term) => lower.includes(term))) {
      return level;
    }
  }
  return null;
}

function detectWorkArrangement(lower: string): WorkArrangement | null {
  if (HYBRID_TERMS.some((term) => lower.includes(term))) return WorkArrangement.HYBRID;
  if (REMOTE_TERMS.some((term) => lower.includes(term))) return WorkArrangement.REMOTE;
  if (ONSITE_TERMS.some((term) => lower.includes(term))) return WorkArrangement.ONSITE;
  return null;
}

/** Best-effort first meaningful line, used as a job-title guess. */
function guessTitle(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length >= 4 && l.length <= 120);
  return line ?? null;
}

/**
 * Offline, regex/keyword-based referral normalizer. Works without any AI key.
 * Deliberately conservative: confidence is low unless the text clearly reads
 * as a job posting (tech-role signal + at least one recognized technology).
 */
@Injectable()
export class HeuristicReferralExtractor implements ReferralExtractor {
  readonly name = 'heuristic';

  async extract(text: string): Promise<ExtractedReferral> {
    const lower = text.toLowerCase();
    const technologies = extractTechnologies(text);
    const techRole = isTechRole(text);

    let confidence = 0;
    if (techRole) confidence += 0.4;
    if (technologies.length > 0) confidence += Math.min(0.4, technologies.length * 0.1);
    if (text.length > 40) confidence += 0.1;
    confidence = Math.min(1, confidence);

    return extractedReferralSchema.parse({
      jobTitle: guessTitle(text),
      company: null, // Free-text company extraction is too unreliable offline; left for the LLM extractor.
      technologies,
      seniority: detectSeniority(lower),
      workArrangement: detectWorkArrangement(lower),
      location: guessIsraeliCity(text),
      confidence,
    });
  }
}
