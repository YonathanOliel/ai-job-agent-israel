import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const buildContext = (role?: UserRole): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => (role ? { user: { id: 'u1', email: 'a@b.co', role } } : {}),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  const buildGuard = (required?: UserRole[]): RolesGuard => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('allows routes without a role requirement', () => {
    expect(buildGuard(undefined).canActivate(buildContext(UserRole.CANDIDATE))).toBe(true);
  });

  it('allows when the user has a required role', () => {
    const guard = buildGuard([UserRole.ADMIN]);
    expect(guard.canActivate(buildContext(UserRole.ADMIN))).toBe(true);
  });

  it('rejects when the user lacks the required role', () => {
    const guard = buildGuard([UserRole.ADMIN]);
    expect(() => guard.canActivate(buildContext(UserRole.CANDIDATE))).toThrow(ForbiddenException);
  });

  it('rejects when there is no authenticated user', () => {
    const guard = buildGuard([UserRole.ADMIN]);
    expect(() => guard.canActivate(buildContext())).toThrow(ForbiddenException);
  });

  it('lets a higher role satisfy a lower requirement (SUPER_ADMIN → ADMIN route)', () => {
    const guard = buildGuard([UserRole.ADMIN]);
    expect(guard.canActivate(buildContext(UserRole.SUPER_ADMIN))).toBe(true);
    expect(() => guard.canActivate(buildContext(UserRole.SUPPORT))).toThrow(ForbiddenException);
  });

  it('restricts SUPER_ADMIN routes to the owner only', () => {
    const guard = buildGuard([UserRole.SUPER_ADMIN]);
    expect(guard.canActivate(buildContext(UserRole.SUPER_ADMIN))).toBe(true);
    expect(() => guard.canActivate(buildContext(UserRole.ADMIN))).toThrow(ForbiddenException);
  });
});
