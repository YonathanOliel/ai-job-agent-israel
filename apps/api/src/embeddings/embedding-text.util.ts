import type { CareerProfile, Job } from '@prisma/client';

/**
 * Composes the text embedded for a job posting: title, company, seniority,
 * technologies/skills, and description. Field order front-loads the highest-
 * signal fields since some embedding models weigh earlier tokens more.
 */
export function buildJobEmbeddingText(
  job: Pick<Job, 'title' | 'company' | 'seniority' | 'technologies' | 'skills' | 'description'>,
): string {
  const parts = [
    job.title,
    job.company,
    job.seniority ? `Seniority: ${job.seniority}` : null,
    job.technologies.length ? `Technologies: ${job.technologies.join(', ')}` : null,
    job.skills.length ? `Skills: ${job.skills.join(', ')}` : null,
    job.description,
  ];
  return parts.filter((part): part is string => Boolean(part && part.trim())).join('\n');
}

/**
 * Composes the text embedded for a candidate's career profile: headline,
 * seniority, desired roles, technologies/skills, and summary.
 */
export function buildProfileEmbeddingText(
  profile: Pick<
    CareerProfile,
    | 'headline'
    | 'summary'
    | 'seniority'
    | 'desiredRoles'
    | 'technologies'
    | 'skills'
    | 'yearsExperience'
  >,
): string {
  const parts = [
    profile.headline,
    profile.seniority ? `Seniority: ${profile.seniority}` : null,
    profile.yearsExperience !== null ? `Years of experience: ${profile.yearsExperience}` : null,
    profile.desiredRoles.length ? `Desired roles: ${profile.desiredRoles.join(', ')}` : null,
    profile.technologies.length ? `Technologies: ${profile.technologies.join(', ')}` : null,
    profile.skills.length ? `Skills: ${profile.skills.join(', ')}` : null,
    profile.summary,
  ];
  return parts.filter((part): part is string => Boolean(part && part.trim())).join('\n');
}
