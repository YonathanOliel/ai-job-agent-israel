export type UserRole = 'CANDIDATE' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
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

export type AuditAction =
  | 'USER_REGISTERED'
  | 'LOGIN_SUCCEEDED'
  | 'LOGIN_FAILED'
  | 'TOKEN_REFRESHED'
  | 'LOGOUT';

export interface AdminSourceRow {
  key: string;
  type: string;
  enabled: boolean;
  lastStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | null;
  lastJobCount: number | null;
  lastRunAt: string | null;
  totalRuns: number;
}

export interface AdminOverview {
  users: { total: number; byRole: Record<string, number>; newLast24h: number };
  auth: { registrations24h: number; loginSucceeded24h: number; loginFailed24h: number };
  sessions: { active: number };
  recentActivity: Array<{
    action: AuditAction;
    userEmail: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
  sources: AdminSourceRow[];
  jobs: {
    totals: { active: number; duplicate: number; closed: number; archived: number; all: number };
    companies: number;
    bySource: Array<{ source: string; count: number }>;
    avgQualityScore: number;
    israel: { located: number; remote: number };
    freshness: { newInLast24h: number; seenInLast7d: number; newestPostedAt: string | null };
  };
  system: { database: 'up' | 'down'; search: 'up' | 'down' | 'disabled' };
}

export interface AdminSession {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}
