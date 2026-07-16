import type { LanguageCode, ResumeStatus } from '@prisma/client';

/** Result of parsing a resume's text content. */
export interface ResumeParseResult {
  id: string;
  status: ResumeStatus;
  language: LanguageCode | null;
  textLength: number;
  /** First characters of the extracted text, for a quick preview. */
  preview: string;
}
