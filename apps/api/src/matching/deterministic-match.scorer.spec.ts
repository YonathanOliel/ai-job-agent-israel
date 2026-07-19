import {
  CareerProfile,
  EmploymentType,
  Job,
  JobStatus,
  LanguageCode,
  SeniorityLevel,
  WorkArrangement,
} from '@prisma/client';
import { DeterministicMatchScorer } from './deterministic-match.scorer';

const baseProfile = (overrides: Partial<CareerProfile> = {}): CareerProfile => ({
  id: 'p1',
  userId: 'u1',
  sourceResumeId: 'r1',
  headline: 'Senior Backend Engineer',
  summary: null,
  yearsExperience: 9,
  seniority: SeniorityLevel.SENIOR,
  desiredRoles: [],
  skills: ['System design'],
  technologies: ['typescript', 'node.js', 'postgresql', 'aws'],
  industries: [],
  preferredLocations: ['tel aviv'],
  workArrangements: [WorkArrangement.HYBRID],
  desiredSalaryMin: 30000,
  desiredSalaryMax: 45000,
  salaryCurrency: 'ILS',
  languages: null,
  education: null,
  experience: null,
  certifications: null,
  projects: null,
  data: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const baseJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'j1',
  source: 'seed',
  externalId: 'seed-001',
  sourceUrl: null,
  title: 'Senior Backend Engineer',
  company: 'TelAviv Cloud Ltd',
  description: 'Build scalable microservices.',
  location: 'Tel Aviv-Yafo',
  city: 'Tel Aviv',
  isRemote: false,
  workArrangement: WorkArrangement.HYBRID,
  employmentType: EmploymentType.FULL_TIME,
  seniority: SeniorityLevel.SENIOR,
  salaryMin: 32000,
  salaryMax: 45000,
  salaryCurrency: 'ILS',
  language: LanguageCode.EN,
  skills: ['System design'],
  technologies: ['node.js', 'typescript', 'postgresql', 'redis', 'aws', 'docker'],
  postedAt: new Date('2026-07-10'),
  status: JobStatus.ACTIVE,
  dedupeKey: null,
  contentHash: null,
  canonicalId: null,
  qualityScore: null,
  firstSeenAt: null,
  lastSeenAt: null,
  createdAt: new Date('2026-07-10'),
  updatedAt: new Date('2026-07-10'),
  ...overrides,
});

describe('DeterministicMatchScorer', () => {
  const scorer = new DeterministicMatchScorer();

  it('scores a strong match highly with explanations', async () => {
    const result = await scorer.score(baseProfile(), baseJob());

    expect(result.overall).toBeGreaterThanOrEqual(70);
    expect(result.dimensions.experience.score).toBe(100);
    expect(result.dimensions.location.score).toBe(100);
    expect(result.dimensions.remote.score).toBe(100);
    expect(result.dimensions.salary.score).toBe(100);
    // 4 of 6 required technologies matched.
    expect(result.dimensions.technology.score).toBe(67);
    expect(result.missingSkills).toEqual(expect.arrayContaining(['redis', 'docker']));
    expect(result.dimensions.technology.explanation).toContain('Missing');
    expect(Object.values(result.dimensions).every((d) => d.score >= 0 && d.score <= 100)).toBe(
      true,
    );
  });

  it('treats a remote job as location-independent', async () => {
    const result = await scorer.score(
      baseProfile({ preferredLocations: ['haifa'] }),
      baseJob({ isRemote: true }),
    );
    expect(result.dimensions.location.score).toBe(100);
  });

  it('flags a step-up role as growth but weaker on experience', async () => {
    const result = await scorer.score(
      baseProfile({ seniority: SeniorityLevel.JUNIOR, yearsExperience: 2 }),
      baseJob({ seniority: SeniorityLevel.LEAD }),
    );
    expect(result.dimensions.experience.score).toBeLessThan(60);
    expect(result.dimensions.growth.score).toBeGreaterThan(70);
  });

  it('lowers confidence when data is sparse', async () => {
    const sparse = baseProfile({
      technologies: [],
      skills: [],
      yearsExperience: null,
      seniority: null,
    });
    const result = await scorer.score(sparse, baseJob());
    expect(result.confidence.score).toBeLessThan(60);
  });
});
