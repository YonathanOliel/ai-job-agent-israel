export type UserRole = 'CANDIDATE' | 'ADMIN';
export type LanguageCode = 'HE' | 'EN';
export type MatchStatus = 'NEW' | 'VIEWED' | 'SAVED' | 'APPLIED' | 'DISMISSED';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  locale: LanguageCode;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  city: string | null;
  isRemote: boolean;
  workArrangement: string | null;
  employmentType: string | null;
  seniority: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  technologies: string[];
  language: LanguageCode | null;
  postedAt: string | null;
  sourceUrl: string | null;
}

export interface DimensionScore {
  score: number;
  explanation: string;
}

export interface MatchScores {
  overall: number;
  confidence: DimensionScore;
  dimensions: Record<string, DimensionScore>;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
}

export interface JobMatch {
  id: string;
  jobId: string;
  overallScore: number;
  status: MatchStatus;
  scores: MatchScores;
  job: Job;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GenerateMatchesResult extends Paginated<JobMatch> {
  generated: number;
}

export interface MatchInsight {
  whyYouFit: string;
  whatYouMiss: string;
  provider: string;
}

export type ReferralStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface JobReferral {
  id: string;
  rawUrl: string | null;
  rawText: string;
  status: ReferralStatus;
  rejectionReason: string | null;
  resultingJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchFilters {
  search?: string;
  city?: string;
  technology?: string;
  seniority?: string;
  isRemote?: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: string;
  updatedAt: string;
}

export type ResumeStatus = 'UPLOADED' | 'PARSING' | 'PARSED' | 'FAILED';

export interface Resume {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: ResumeStatus;
  language: LanguageCode | null;
  createdAt: string;
}

export interface ResumeParseResult {
  id: string;
  status: ResumeStatus;
  language: LanguageCode | null;
  textLength: number;
  preview: string;
}

export interface ProfileLanguage {
  name: string;
  proficiency?: string;
}

export interface CareerProfile {
  id: string;
  headline: string | null;
  summary: string | null;
  yearsExperience: number | null;
  seniority: string | null;
  desiredRoles: string[];
  skills: string[];
  technologies: string[];
  industries: string[];
  preferredLocations: string[];
  languages: ProfileLanguage[] | null;
  createdAt: string;
  updatedAt: string;
}
