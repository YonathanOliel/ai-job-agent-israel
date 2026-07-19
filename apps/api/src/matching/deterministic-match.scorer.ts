import { Injectable } from '@nestjs/common';
import { CareerProfile, Job, SeniorityLevel, WorkArrangement } from '@prisma/client';
import { computeWeightedOverall } from './match-weights';
import type {
  DimensionScore,
  MatchDimensions,
  MatchResult,
  MatchScorer,
} from './match-score.types';

const SENIORITY_RANK: Record<SeniorityLevel, number> = {
  STUDENT: 0,
  JUNIOR: 1,
  MID: 2,
  SENIOR: 3,
  LEAD: 4,
  MANAGER: 5,
  DIRECTOR: 6,
  EXECUTIVE: 7,
};

/**
 * Deterministic, offline match scorer. Produces every dimension with an
 * explanation and a weighted overall score. A semantic/embedding or LLM scorer
 * can replace it behind the {@link MatchScorer} interface.
 */
@Injectable()
export class DeterministicMatchScorer implements MatchScorer {
  readonly name = 'deterministic';

  /** Fully offline and synchronous; wrapped in a resolved promise to satisfy {@link MatchScorer}. */
  score(profile: CareerProfile, job: Job): Promise<MatchResult> {
    return Promise.resolve(this.computeSync(profile, job));
  }

  private computeSync(profile: CareerProfile, job: Job): MatchResult {
    const technology = this.scoreOverlap(
      'technologies',
      this.normalize(job.technologies),
      this.normalize(profile.technologies),
    );
    const skill = this.scoreOverlap(
      'skills',
      this.normalize(job.skills),
      this.normalize(profile.skills),
    );
    const experience = this.scoreExperience(profile, job);
    const location = this.scoreLocation(profile, job);
    const remote = this.scoreRemote(profile, job);
    const salary = this.scoreSalary(profile, job);
    const industry = this.scoreIndustry(profile, job);
    const growth = this.scoreGrowth(profile, job);
    const careerProgression = this.scoreCareerProgression(profile, job);
    const learningOpportunity = this.scoreLearning(profile, job);
    const culture = this.scoreCulture();
    const interviewProbability = this.scoreInterviewProbability(technology, skill, experience);

    const dimensions: MatchDimensions = {
      experience,
      skill,
      technology,
      industry,
      culture,
      growth,
      salary,
      location,
      remote,
      careerProgression,
      learningOpportunity,
      interviewProbability,
    };

    const overall = this.weightedOverall(dimensions);
    const confidence = this.scoreConfidence(profile, job);
    const { strengths, weaknesses } = this.summarize(dimensions);
    const missingSkills = [
      ...this.missing(this.normalize(job.technologies), this.normalize(profile.technologies)),
      ...this.missing(this.normalize(job.skills), this.normalize(profile.skills)),
    ];

    return { overall, confidence, dimensions, strengths, weaknesses, missingSkills };
  }

  private scoreOverlap(label: string, required: string[], have: string[]): DimensionScore {
    if (required.length === 0) {
      return { score: 60, explanation: `No specific ${label} were listed for this job.` };
    }
    const matched = required.filter((item) => have.includes(item));
    const missing = required.filter((item) => !have.includes(item));
    const score = Math.round((matched.length / required.length) * 100);
    const parts = [`You match ${matched.length} of ${required.length} required ${label}.`];
    if (matched.length) parts.push(`Matched: ${matched.join(', ')}.`);
    if (missing.length) parts.push(`Missing: ${missing.join(', ')}.`);
    return { score, explanation: parts.join(' ') };
  }

  private scoreExperience(profile: CareerProfile, job: Job): DimensionScore {
    const profileRank = this.profileRank(profile);
    if (profileRank === null || job.seniority === null) {
      return { score: 60, explanation: 'Seniority could not be fully determined from the data.' };
    }
    const diff = profileRank - SENIORITY_RANK[job.seniority];
    if (diff === 0) {
      return { score: 100, explanation: 'Your seniority level matches the role exactly.' };
    }
    if (diff > 0) {
      return {
        score: Math.max(55, 100 - diff * 15),
        explanation: `You are more senior than this role requires (by ${diff} level${diff > 1 ? 's' : ''}).`,
      };
    }
    return {
      score: Math.max(20, 100 + diff * 25),
      explanation: `This role is a step up (${-diff} level${-diff > 1 ? 's' : ''} above your current seniority).`,
    };
  }

  private scoreLocation(profile: CareerProfile, job: Job): DimensionScore {
    if (job.isRemote) {
      return { score: 100, explanation: 'This role is remote, so location is not a constraint.' };
    }
    const preferred = this.normalize(profile.preferredLocations);
    if (preferred.length === 0) {
      return { score: 60, explanation: 'You have not set preferred locations.' };
    }
    if (job.city && preferred.includes(job.city.toLowerCase())) {
      return {
        score: 100,
        explanation: `The job is in ${job.city}, one of your preferred locations.`,
      };
    }
    return {
      score: 35,
      explanation: `The job is in ${job.city ?? 'an unlisted location'}, which is not among your preferred locations.`,
    };
  }

  private scoreRemote(profile: CareerProfile, job: Job): DimensionScore {
    const jobArrangement =
      job.workArrangement ?? (job.isRemote ? WorkArrangement.REMOTE : WorkArrangement.ONSITE);
    if (profile.workArrangements.length === 0) {
      return { score: 60, explanation: 'You have not set a work-arrangement preference.' };
    }
    if (profile.workArrangements.includes(jobArrangement)) {
      return {
        score: 100,
        explanation: `The job's ${jobArrangement.toLowerCase()} arrangement matches your preference.`,
      };
    }
    return {
      score: 40,
      explanation: `The job is ${jobArrangement.toLowerCase()}, which differs from your preferred arrangement.`,
    };
  }

  private scoreSalary(profile: CareerProfile, job: Job): DimensionScore {
    if (profile.desiredSalaryMin === null && profile.desiredSalaryMax === null) {
      return { score: 60, explanation: 'You have not set a salary expectation.' };
    }
    if (job.salaryMin === null && job.salaryMax === null) {
      return { score: 60, explanation: 'The job does not disclose a salary range.' };
    }
    const desiredMin = profile.desiredSalaryMin ?? 0;
    const jobMax = job.salaryMax ?? job.salaryMin ?? 0;
    if (jobMax >= desiredMin) {
      return { score: 100, explanation: 'The salary range meets or exceeds your expectation.' };
    }
    const ratio = desiredMin > 0 ? jobMax / desiredMin : 0;
    return {
      score: Math.max(20, Math.round(ratio * 100)),
      explanation: `The top of the salary range (${jobMax}) is below your expectation (${desiredMin}).`,
    };
  }

  private scoreIndustry(profile: CareerProfile, job: Job): DimensionScore {
    const industries = this.normalize(profile.industries);
    if (industries.length === 0) {
      return { score: 60, explanation: 'You have not specified target industries.' };
    }
    const haystack = `${job.company} ${job.description}`.toLowerCase();
    const matched = industries.filter((industry) => haystack.includes(industry));
    if (matched.length) {
      return {
        score: 100,
        explanation: `The role aligns with your industry: ${matched.join(', ')}.`,
      };
    }
    return { score: 50, explanation: 'The role does not clearly match your target industries.' };
  }

  private scoreGrowth(profile: CareerProfile, job: Job): DimensionScore {
    const profileRank = this.profileRank(profile);
    if (profileRank === null || job.seniority === null) {
      return { score: 55, explanation: 'Growth potential could not be fully assessed.' };
    }
    const diff = SENIORITY_RANK[job.seniority] - profileRank;
    if (diff > 0) {
      return {
        score: Math.min(100, 70 + diff * 12),
        explanation: 'This role represents upward growth in seniority.',
      };
    }
    if (diff === 0) {
      return { score: 60, explanation: 'This role is a lateral move at your current level.' };
    }
    return { score: 40, explanation: 'This role is below your current seniority.' };
  }

  private scoreCareerProgression(profile: CareerProfile, job: Job): DimensionScore {
    const growth = this.scoreGrowth(profile, job);
    return {
      score: growth.score,
      explanation: growth.explanation.replace('growth in seniority', 'career progression'),
    };
  }

  private scoreLearning(profile: CareerProfile, job: Job): DimensionScore {
    const newTech = this.missing(
      this.normalize(job.technologies),
      this.normalize(profile.technologies),
    );
    if (newTech.length === 0) {
      return { score: 45, explanation: 'The role uses technologies you already know.' };
    }
    return {
      score: Math.min(100, 40 + newTech.length * 15),
      explanation: `You would gain exposure to: ${newTech.join(', ')}.`,
    };
  }

  private scoreCulture(): DimensionScore {
    return { score: 50, explanation: 'Not enough structured data to assess culture fit.' };
  }

  private scoreInterviewProbability(
    technology: DimensionScore,
    skill: DimensionScore,
    experience: DimensionScore,
  ): DimensionScore {
    const score = Math.round(technology.score * 0.45 + skill.score * 0.2 + experience.score * 0.35);
    return {
      score,
      explanation: `Estimated from technology (${technology.score}), skill (${skill.score}), and experience (${experience.score}) fit.`,
    };
  }

  private scoreConfidence(profile: CareerProfile, job: Job): DimensionScore {
    const signals = [
      profile.technologies.length > 0,
      profile.skills.length > 0,
      profile.yearsExperience !== null || profile.seniority !== null,
      job.technologies.length > 0,
      job.seniority !== null,
      job.salaryMin !== null || job.salaryMax !== null,
    ];
    const present = signals.filter(Boolean).length;
    const score = Math.round((present / signals.length) * 100);
    return { score, explanation: `Based on ${present}/${signals.length} available data signals.` };
  }

  private weightedOverall(dimensions: MatchDimensions): number {
    return computeWeightedOverall(dimensions);
  }

  private summarize(dimensions: MatchDimensions): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    for (const [key, value] of Object.entries(dimensions) as Array<[string, DimensionScore]>) {
      if (value.score >= 80) strengths.push(key);
      else if (value.score < 45) weaknesses.push(key);
    }
    return { strengths, weaknesses };
  }

  private profileRank(profile: CareerProfile): number | null {
    if (profile.seniority) {
      return SENIORITY_RANK[profile.seniority];
    }
    if (profile.yearsExperience === null) {
      return null;
    }
    if (profile.yearsExperience >= 8) return SENIORITY_RANK.SENIOR;
    if (profile.yearsExperience >= 4) return SENIORITY_RANK.MID;
    if (profile.yearsExperience >= 1) return SENIORITY_RANK.JUNIOR;
    return SENIORITY_RANK.STUDENT;
  }

  private normalize(values: string[]): string[] {
    return [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
  }

  private missing(required: string[], have: string[]): string[] {
    return required.filter((item) => !have.includes(item));
  }
}
