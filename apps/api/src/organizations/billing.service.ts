import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  currentPeriod,
  DEFAULT_PLAN,
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
 * Per-organization plan and usage. The product is free for everyone today, so
 * there are no seat limits or paywalls; usage is still metered for analytics
 * and so paid tiers can be layered on later without reworking callers.
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private planOf(plan: string | null | undefined): PlanKey {
    return plan && isPlanKey(plan) ? plan : DEFAULT_PLAN;
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

  /**
   * Enforces the plan's seat limit. On the free plan `maxMembers` is null
   * (unlimited), so this never blocks; the hook stays for future paid tiers.
   */
  async assertCanAddMember(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const plan = this.planOf(org?.plan);
    const { maxMembers } = PLAN_CATALOG[plan];
    if (maxMembers === null) {
      return;
    }
    const members = await this.prisma.organizationMembership.count({ where: { organizationId } });
    if (members >= maxMembers) {
      throw new ForbiddenException(
        `Plan "${plan}" allows up to ${maxMembers} members. Upgrade to add more.`,
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
}
