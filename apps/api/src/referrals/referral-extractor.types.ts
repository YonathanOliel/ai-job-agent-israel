import type { ExtractedReferral } from './extracted-referral.schema';

/** DI token for the active {@link ReferralExtractor} strategy. */
export const REFERRAL_EXTRACTOR = Symbol('REFERRAL_EXTRACTOR');

/**
 * Turns a chaotic, slang-heavy raw job-referral post (Hebrew, English, or
 * mixed) into an {@link ExtractedReferral}. Implementations must never invent
 * information — only structure what the text actually contains.
 */
export interface ReferralExtractor {
  readonly name: string;
  extract(text: string): Promise<ExtractedReferral>;
}
