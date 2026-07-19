import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { currentPeriod } from './plan.catalog';

type PrismaMock = {
  organization: { findUnique: jest.Mock };
  organizationMembership: { count: jest.Mock };
  usageRecord: { findMany: jest.Mock; upsert: jest.Mock };
};

function createPrismaMock(): PrismaMock {
  return {
    organization: { findUnique: jest.fn() },
    organizationMembership: { count: jest.fn() },
    usageRecord: { findMany: jest.fn(), upsert: jest.fn() },
  };
}

describe('BillingService', () => {
  let prisma: PrismaMock;
  let service: BillingService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new BillingService(prisma as never);
  });

  describe('getSummary', () => {
    it('returns the free plan with unlimited limits and current-period usage', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'free' });
      prisma.organizationMembership.count.mockResolvedValue(4);
      prisma.usageRecord.findMany.mockResolvedValue([
        { metric: 'talent_search', count: 12 },
        { metric: 'api_call', count: 300 },
      ]);

      const summary = await service.getSummary('org1');

      expect(summary.plan).toBe('free');
      expect(summary.limits.maxMembers).toBeNull();
      expect(summary.limits.priceMonthlyUsd).toBe(0);
      expect(summary.usage).toEqual({ members: 4, talentSearches: 12, apiCalls: 300 });
      expect(summary.period).toBe(currentPeriod());
    });

    it('falls back to the free plan for unknown plan strings', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'legacy' });
      prisma.organizationMembership.count.mockResolvedValue(1);
      prisma.usageRecord.findMany.mockResolvedValue([]);

      const summary = await service.getSummary('org1');

      expect(summary.plan).toBe('free');
      expect(summary.usage).toEqual({ members: 1, talentSearches: 0, apiCalls: 0 });
    });

    it('throws when the organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getSummary('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertCanAddMember', () => {
    it('never blocks on the free plan (unlimited members)', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'free' });
      await expect(service.assertCanAddMember('org1')).resolves.toBeUndefined();
      // Unlimited plan short-circuits before counting members.
      expect(prisma.organizationMembership.count).not.toHaveBeenCalled();
    });
  });

  describe('recordUsage', () => {
    it('upserts an incrementing counter for the current period', async () => {
      prisma.usageRecord.upsert.mockResolvedValue({});
      await service.recordUsage('org1', 'talent_search', 2);

      expect(prisma.usageRecord.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_metric_period: {
            organizationId: 'org1',
            metric: 'talent_search',
            period: currentPeriod(),
          },
        },
        create: {
          organizationId: 'org1',
          metric: 'talent_search',
          period: currentPeriod(),
          count: 2,
        },
        update: { count: { increment: 2 } },
      });
    });
  });
});
