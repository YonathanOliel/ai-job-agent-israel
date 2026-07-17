import type { EmploymentType, LanguageCode, SeniorityLevel, WorkArrangement } from '@prisma/client';

/** DI token bound to the array of enabled {@link JobSource} implementations. */
export const JOB_SOURCES = Symbol('JOB_SOURCES');

/** A normalized job posting as returned by a source, before persistence. */
export interface RawJob {
  /** Stable identifier of the posting within its source. */
  externalId: string;
  sourceUrl?: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  city?: string;
  isRemote?: boolean;
  workArrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  seniority?: SeniorityLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  language?: LanguageCode;
  skills?: string[];
  technologies?: string[];
  postedAt?: Date;
}

/**
 * A source of Israeli job postings. Implementations must honor each source's
 * terms, robots.txt, API licensing, and copyright — preferring official APIs
 * and feeds. New compliant sources plug in behind this interface.
 */
export interface JobSource {
  /** Stable source key (persisted on each job, e.g. "seed"). */
  readonly name: string;
  fetchJobs(): Promise<RawJob[]>;
}
