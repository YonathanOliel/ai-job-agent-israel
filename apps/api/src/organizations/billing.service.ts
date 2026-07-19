import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  currentPeriod,
  isPlanKey,
  PLAN_CATALOG,
  type MeteredMetric,
  type PlanKey,
  type PlanLimits,
} from './plan.catalog';

export interface BillingSummary {
  plan: PlanKey;
  limits: PlanLimits;
  usage: { members: number; talentSearches: number; apiCalls: number };
  period: string;
}

/**
 * Per-organization billing: plan entitlements, usage metering, and limit
 * enforcement. Payment-provider integration (Stripe) plugs in later; the plan
 * catalog and metering are the durable foundation.
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private planOf(plan: string): PlanKey {
    return isPlanKey(plan) ? plan : 'free';
  }

  async getSummary(organizationId: string): Promise<BillingSummary> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const plan = this.planOf(org.plan);
    const period = currentPeriod();
    const [members, usageRows] = await Promise.all([
      this.prisma.organizationMembership.count({ where: { organizationId } }),
      this.prisma.usageRecord.findMany({ where: { organizationId, period } }),
    ]);
    const usageFor = (metric: MeteredMetric): number =>
      usageRows.find((row) => row.metric === metric)?.count ?? 0;

    return {
      plan,
      limits: PLAN_CATALOG[plan],
      usage: {
        members,
        talentSearches: usageFor('talent_search'),
        apiCalls: usageFor('api_call'),
      },
      period,
    };
  }

  /** Throws when adding another member would exceed the plan's seat limit. */
  async assertCanAddMember(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const plan = this.planOf(org?.plan ?? 'free');
    const members = await this.prisma.organizationMembership.count({ where: { organizationId } });
    if (members >= PLAN_CATALOG[plan].maxMembers) {
      throw new ForbiddenException(
        `Plan "${plan}" allows up to ${PLAN_CATALOG[plan].maxMembers} members. Upgrade to add more.`,
      );
    }
  }

  /** Records metered usage (idempotent-safe increment) for the current period. */
  async recordUsage(organizationId: string, metric: MeteredMetric, amount = 1): Promise<void> {
    const period = currentPeriod();
    await this.prisma.usageRecord.upsert({
      where: { organizationId_metric_period: { organizationId, metric, period } },
      create: { organizationId, metric, period, count: amount },
      update: { count: { increment: amount } },
    });
  }

  async setPlan(organizationId: string, plan: string): Promise<BillingSummary> {
    if (!isPlanKey(plan)) {
      throw new ForbiddenException(`Unknown plan "${plan}"`);
    }
    await this.prisma.organization.update({ where: { id: organizationId }, data: { plan } });
    return this.getSummary(organizationId);
  }
}
