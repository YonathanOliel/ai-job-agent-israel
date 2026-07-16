import type { LanguageCode, UserRole } from '@prisma/client';

/** Safe, client-facing representation of a user (never exposes the hash). */
export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  locale: LanguageCode;
  createdAt: Date;
}

/** Access + refresh token pair returned by auth endpoints. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access-token lifetime in seconds. */
  expiresIn: number;
}

/** Standard authentication response. */
export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

/** Request metadata captured for auditing and token binding. */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}
