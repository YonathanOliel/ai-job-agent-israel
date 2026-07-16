import { SeniorityLevel } from '@prisma/client';
import { z } from 'zod';

const languageEntry = z.object({
  name: z.string(),
  proficiency: z.string().optional(),
});

const educationEntry = z.object({
  institution: z.string().optional(),
  degree: z.string().optional(),
  field: z.string().optional(),
  year: z.string().optional(),
});

const experienceEntry = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

const projectEntry = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Canonical structured representation of a resume. Both the heuristic and LLM
 * extractors produce this shape; the LLM output is validated against it.
 */
export const structuredProfileSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  yearsExperience: z.number().nonnegative().optional(),
  seniority: z.nativeEnum(SeniorityLevel).optional(),
  desiredRoles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  languages: z.array(languageEntry).default([]),
  education: z.array(educationEntry).default([]),
  experience: z.array(experienceEntry).default([]),
  certifications: z.array(z.string()).default([]),
  projects: z.array(projectEntry).default([]),
});

export type StructuredProfile = z.infer<typeof structuredProfileSchema>;
