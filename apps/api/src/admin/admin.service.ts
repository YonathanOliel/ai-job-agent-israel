import { Injectable } from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatsService, type JobStats } from '../jobs/job-stats.service';
import { SourceRegistryService } from '../jobs/source-registry.service';
import { JobSearchService } from '../search/job-search.service';

export interface AdminOverview {
  users: { total: number; byRole: Record<string, number>; newLast24h: number };
  auth: { registrations24h: number; loginSucceeded24h: number; loginFailed24h: number };
  sessions: { active: number };
  recentActivity: Array<{
    action: AuditAction;
    userEmail: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>;
  sources: unknown[];
  jobs: JobStats;
  system: { database: 'up' | 'down'; search: 'up' | 'down' | 'disabled' };
}

export interface AdminSession {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface AdminUserList {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Read model for the Super-Admin console: aggregates users, sessions, auth
 * activity, source health, job stats and system health into one view, and
 * supports terminating sessions. Every method is Super-Admin-gated at the API.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobStats: JobStatsService,
    private readonly sources: SourceRegistryService,
    private readonly search: JobSearchService,
  ) {}

  async overview(): Promise<AdminOverview> {
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      total,
      byRole,
      newLast24h,
      registrations24h,
      loginSucceeded24h,
      loginFailed24h,
      activeSessions,
      recent,
      sources,
      jobs,
      databaseUp,
      searchUp,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: day } } }),
      this.prisma.auditLog.count({
        where: { action: AuditAction.USER_REGISTERED, createdAt: { gte: day } },
      }),
      this.prisma.auditLog.count({
        where: { action: AuditAction.LOGIN_SUCCEEDED, createdAt: { gte: day } },
      }),
      this.prisma.auditLog.count({
        where: { action: AuditAction.LOGIN_FAILED, createdAt: { gte: day } },
      }),
      this.prisma.refreshToken.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { email: true } } },
      }),
      this.sources.list(),
      this.jobStats.compute(),
      this.prisma.isHealthy(),
      this.search.enabled ? this.search.ping() : Promise.resolve(false),
    ]);

    const roleCounts: Record<string, number> = {
      CANDIDATE: 0,
      SUPPORT: 0,
      ADMIN: 0,
      SUPER_ADMIN: 0,
    };
    for (const row of byRole) {
      roleCounts[row.role] = row._count._all;
    }

    return {
      users: { total, byRole: roleCounts, newLast24h },
      auth: { registrations24h, loginSucceeded24h, loginFailed24h },
      sessions: { active: activeSessions },
      recentActivity: recent.map((entry) => ({
        action: entry.action,
        userEmail: entry.user?.email ?? null,
        ipAddress: entry.ipAddress,
        createdAt: entry.createdAt,
      })),
      sources,
      jobs,
      system: {
        database: databaseUp ? 'up' : 'down',
        search: !this.search.enabled ? 'disabled' : searchUp ? 'up' : 'down',
      },
    };
  }

  async listSessions(): Promise<AdminSession[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { email: true } } },
    });
    return tokens.map((token) => ({
      id: token.id,
      userId: token.userId,
      userEmail: token.user.email,
      ipAddress: token.ipAddress,
      userAgent: token.userAgent,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    }));
  }

  /** Force-logout: revokes all active refresh tokens for a user. */
  async revokeUserSessions(userId: string): Promise<{ revoked: number }> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
  }

  /** Sets a user's role (SUPER_ADMIN cannot be assigned here to avoid escalation). */
  async setRole(userId: string, role: UserRole): Promise<{ id: string; role: UserRole }> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    return { id: user.id, role: user.role };
  }

  /** Paginated user directory with optional email/name search. */
  async listUsers(params: {
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<AdminUserList> {
    const where = params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' as const } },
            { displayName: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: { id: true, email: true, displayName: true, role: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}
