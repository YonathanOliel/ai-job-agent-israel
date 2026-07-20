import type {
  AdminOverview,
  AuthResult,
  CareerProfile,
  GenerateMatchesResult,
  Job,
  JobMatch,
  JobReferral,
  MatchInsight,
  MatchStatus,
  Paginated,
  PublicUser,
  Resume,
  ResumeParseResult,
  SavedSearch,
  SavedSearchFilters,
} from './api-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface JobFilters {
  search?: string;
  city?: string;
  technology?: string;
  seniority?: string;
  isRemote?: boolean;
  page?: number;
  pageSize?: number;
}

function toQuery(filters: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('לא ניתן להתחבר לשרת. ודא שהשרת פועל.', 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = extractMessage(payload) ?? 'אירעה שגיאה. נסה שוב.';
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

function extractMessage(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return null;
}

export const api = {
  register: (body: { email: string; password: string; displayName?: string }) =>
    request<AuthResult>('/auth/register', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<AuthResult>('/auth/login', { method: 'POST', body }),

  me: (token: string) => request<PublicUser>('/auth/me', { token }),

  uploadResume: async (token: string, file: File): Promise<Resume> => {
    const body = new FormData();
    body.append('file', file);
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/resumes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
    } catch {
      throw new ApiError('לא ניתן להתחבר לשרת. ודא שהשרת פועל.', 0);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(extractMessage(payload) ?? 'העלאת הקובץ נכשלה.', response.status);
    }
    return payload as Resume;
  },

  listResumes: (token: string) => request<Resume[]>('/resumes', { token }),

  parseResume: (token: string, resumeId: string) =>
    request<ResumeParseResult>(`/resumes/${resumeId}/parse`, { method: 'POST', token }),

  generateProfile: (token: string, resumeId: string) =>
    request<CareerProfile>('/career-profile/generate', {
      method: 'POST',
      body: { resumeId },
      token,
    }),

  getProfile: (token: string) => request<CareerProfile>('/career-profile', { token }),

  listJobs: (token: string, filters: JobFilters = {}) =>
    request<Paginated<Job>>(`/jobs${toQuery({ pageSize: 10, ...filters })}`, { token }),

  generateMatches: (token: string) =>
    request<GenerateMatchesResult>('/matches/generate', { method: 'POST', token }),

  listMatches: (token: string, params: { status?: MatchStatus } = {}) => {
    const query = params.status ? `?status=${params.status}` : '';
    return request<Paginated<JobMatch>>(`/matches${query}`, { token });
  },

  updateMatchStatus: (token: string, jobId: string, status: MatchStatus) =>
    request<JobMatch>(`/matches/${jobId}/status`, { method: 'PATCH', body: { status }, token }),

  explainMatch: (token: string, jobId: string) =>
    request<MatchInsight>(`/matches/${jobId}/explain`, { method: 'POST', token }),

  submitReferral: (token: string, body: { text: string; url?: string }) =>
    request<JobReferral>('/referrals', { method: 'POST', body, token }),

  listReferrals: (token: string) => request<JobReferral[]>('/referrals', { token }),

  createSavedSearch: (token: string, body: { name: string; filters: SavedSearchFilters }) =>
    request<SavedSearch>('/saved-searches', { method: 'POST', body, token }),

  listSavedSearches: (token: string) => request<SavedSearch[]>('/saved-searches', { token }),

  deleteSavedSearch: (token: string, id: string) =>
    request<void>(`/saved-searches/${id}`, { method: 'DELETE', token }),

  getAdminOverview: (token: string) => request<AdminOverview>('/admin/overview', { token }),
};
