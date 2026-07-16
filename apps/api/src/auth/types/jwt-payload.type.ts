import type { UserRole } from '@prisma/client';

/** Claims embedded in the signed access token. */
export interface JwtPayload {
  /** Subject — the user id. */
  sub: string;
  email: string;
  role: UserRole;
}

/** The authenticated principal attached to each request. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
