import type { LanguageCode } from '@prisma/client';
import type { StructuredProfile } from './structured-profile.schema';

/** DI token for the active {@link ProfileExtractor} strategy. */
export const PROFILE_EXTRACTOR = Symbol('PROFILE_EXTRACTOR');

/**
 * Turns raw resume text into a {@link StructuredProfile}. Implementations must
 * never invent information — only structure what the text actually contains.
 */
export interface ProfileExtractor {
  readonly name: string;
  extract(text: string, language: LanguageCode): Promise<StructuredProfile>;
}
