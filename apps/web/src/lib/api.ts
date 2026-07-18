import type {
  AuthResult,
  GenerateMatchesResult,
  JobMatch,
  MatchStatus,
  Paginated,
  PublicUser,
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

  generateMatches: (token: string) =>
    request<GenerateMatchesResult>('/matches/generate', { method: 'POST', token }),

  listMatches: (token: string, params: { status?: MatchStatus } = {}) => {
    const query = params.status ? `?status=${params.status}` : '';
    return request<Paginated<JobMatch>>(`/matches${query}`, { token });
  },

  updateMatchStatus: (token: string, jobId: string, status: MatchStatus) =>
    request<JobMatch>(`/matches/${jobId}/status`, { method: 'PATCH', body: { status }, token }),
};
