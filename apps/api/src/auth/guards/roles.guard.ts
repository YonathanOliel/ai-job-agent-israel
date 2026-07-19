import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/jwt-payload.type';

/** Role hierarchy: a higher rank satisfies every requirement at or below it. */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.CANDIDATE]: 0,
  [UserRole.SUPPORT]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3,
};

/**
 * Global guard enforcing role requirements declared via {@link Roles}. Routes
 * without a role requirement are allowed (authentication is handled separately).
 * A user satisfies a requirement when their role ranks at or above it, so
 * SUPER_ADMIN can reach every ADMIN/SUPPORT route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    const minRank = Math.min(...required.map((role) => ROLE_RANK[role]));
    if (!user || ROLE_RANK[user.role] < minRank) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
