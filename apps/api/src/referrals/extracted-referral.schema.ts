import { SeniorityLevel, WorkArrangement } from '@prisma/client';
import { z } from 'zod';

/**
 * Canonical structured representation of a normalized referral posting. Both
 * the heuristic and LLM extractors produce this shape; the LLM output is
 * validated against it. Never fabricated — unknown fields are null/empty.
 */
export const extractedReferralSchema = z.object({
  jobTitle: z.string().nullable().default(null),
  company: z.string().nullable().default(null),
  technologies: z.array(z.string()).default([]),
  seniority: z.nativeEnum(SeniorityLevel).nullable().default(null),
  workArrangement: z.nativeEnum(WorkArrangement).nullable().default(null),
  location: z.string().nullable().default(null),
  /** 0–1: how confident the extractor is that this is a genuine job posting. */
  confidence: z.number().min(0).max(1).default(0),
});

export type ExtractedReferral = z.infer<typeof extractedReferralSchema>;
