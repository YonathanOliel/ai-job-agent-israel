import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { currentPeriod } from './plan.catalog';

type PrismaMock = {
  organization: { findUnique: jest.Mock; update: jest.Mock };
  organizationMembership: { count: jest.Mock };
  usageRecord: { findMany: jest.Mock; upsert: jest.Mock };
};

function createPrismaMock(): PrismaMock {
  return {
    organization: { findUnique: jest.fn(), update: jest.fn() },
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
    it('returns plan limits and current-period usage', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'pro' });
      prisma.organizationMembership.count.mockResolvedValue(4);
      prisma.usageRecord.findMany.mockResolvedValue([
        { metric: 'talent_search', count: 12 },
        { metric: 'api_call', count: 300 },
      ]);

      const summary = await service.getSummary('org1');

      expect(summary.plan).toBe('pro');
      expect(summary.limits.maxMembers).toBe(15);
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
    it('allows adding a member below the plan limit', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'free' });
      prisma.organizationMembership.count.mockResolvedValue(2);
      await expect(service.assertCanAddMember('org1')).resolves.toBeUndefined();
    });

    it('blocks adding a member at the plan limit', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'free' });
      prisma.organizationMembership.count.mockResolvedValue(3);
      await expect(service.assertCanAddMember('org1')).rejects.toBeInstanceOf(ForbiddenException);
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

  describe('setPlan', () => {
    it('rejects unknown plans', async () => {
      await expect(service.setPlan('org1', 'ultra')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('updates the plan and returns the new summary', async () => {
      prisma.organization.update.mockResolvedValue({});
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', plan: 'enterprise' });
      prisma.organizationMembership.count.mockResolvedValue(1);
      prisma.usageRecord.findMany.mockResolvedValue([]);

      const summary = await service.setPlan('org1', 'enterprise');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: { plan: 'enterprise' },
      });
      expect(summary.plan).toBe('enterprise');
      expect(summary.limits.maxMembers).toBe(1000);
    });
  });
});
