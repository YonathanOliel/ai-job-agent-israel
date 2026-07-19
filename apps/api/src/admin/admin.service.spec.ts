import { PrismaService } from '../prisma/prisma.service';
import { JobStatsService } from '../jobs/job-stats.service';
import { SourceRegistryService } from '../jobs/source-registry.service';
import { JobSearchService } from '../search/job-search.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('aggregates users, auth, sessions, sources, jobs and system health', async () => {
    const prisma = {
      user: {
        count: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(2),
        groupBy: jest.fn().mockResolvedValue([
          { role: 'CANDIDATE', _count: { _all: 8 } },
          { role: 'SUPER_ADMIN', _count: { _all: 1 } },
        ]),
      },
      auditLog: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(5).mockResolvedValueOnce(1),
        findMany: jest.fn().mockResolvedValue([
          {
            action: 'LOGIN_SUCCEEDED',
            ipAddress: '1.2.3.4',
            createdAt: new Date('2026-07-19T00:00:00Z'),
            user: { email: 'owner@example.com' },
          },
        ]),
      },
      refreshToken: { count: jest.fn().mockResolvedValue(4) },
      isHealthy: jest.fn().mockResolvedValue(true),
    };
    const jobStats = { compute: jest.fn().mockResolvedValue({ totals: { active: 250 } }) };
    const sources = { list: jest.fn().mockResolvedValue([{ key: 'greenhouse' }]) };
    const search = { enabled: true, ping: jest.fn().mockResolvedValue(true) };

    const service = new AdminService(
      prisma as unknown as PrismaService,
      jobStats as unknown as JobStatsService,
      sources as unknown as SourceRegistryService,
      search as unknown as JobSearchService,
    );

    const overview = await service.overview();

    expect(overview.users).toEqual({
      total: 10,
      byRole: { CANDIDATE: 8, SUPPORT: 0, ADMIN: 0, SUPER_ADMIN: 1 },
      newLast24h: 2,
    });
    expect(overview.auth).toEqual({
      registrations24h: 3,
      loginSucceeded24h: 5,
      loginFailed24h: 1,
    });
    expect(overview.sessions).toEqual({ active: 4 });
    expect(overview.recentActivity[0]!.userEmail).toBe('owner@example.com');
    expect(overview.system).toEqual({ database: 'up', search: 'up' });
    expect(overview.sources).toEqual([{ key: 'greenhouse' }]);
  });

  it('revokes all active sessions for a user', async () => {
    const prisma = {
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    const service = new AdminService(
      prisma as unknown as PrismaService,
      {} as unknown as JobStatsService,
      {} as unknown as SourceRegistryService,
      {} as unknown as JobSearchService,
    );

    const result = await service.revokeUserSessions('user-1');

    expect(result).toEqual({ revoked: 3 });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
