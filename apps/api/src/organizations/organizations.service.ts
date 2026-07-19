import { createHash, randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Organization, OrganizationMembership, OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BillingService } from './billing.service';

export interface OrgMember {
  userId: string;
  email: string;
  role: OrgRole;
  createdAt: Date;
}

/**
 * Multi-tenant organizations. A user who creates an org becomes its OWNER.
 * Membership is the tenant-isolation boundary — every org-scoped read/write
 * must go through {@link requireMembership}, so one tenant can never see
 * another's data.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly billing: BillingService,
  ) {}

  async create(ownerUserId: string, name: string): Promise<Organization> {
    return this.prisma.organization.create({
      data: {
        name,
        slug: this.slugify(name),
        memberships: { create: { userId: ownerUserId, role: OrgRole.OWNER } },
      },
    });
  }

  listForUser(userId: string): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Returns the membership or throws — the tenant-isolation gate. */
  async requireMembership(userId: string, organizationId: string): Promise<OrganizationMembership> {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) {
      // Do not reveal whether the org exists to non-members.
      throw new NotFoundException('Organization not found');
    }
    return membership;
  }

  async listMembers(userId: string, organizationId: string): Promise<OrgMember[]> {
    await this.requireMembership(userId, organizationId);
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true } } },
    });
    return memberships.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }

  async addMember(
    actingUserId: string,
    organizationId: string,
    email: string,
    role: OrgRole,
  ): Promise<OrgMember> {
    const acting = await this.requireMembership(actingUserId, organizationId);
    if (acting.role === OrgRole.MEMBER) {
      throw new ForbiddenException('Only owners and admins can add members');
    }
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
    });
    // Only new seats count against the plan limit; role changes don't.
    if (!existing) {
      await this.billing.assertCanAddMember(organizationId);
    }
    const membership = await this.prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      create: { organizationId, userId: user.id, role },
      update: { role },
    });
    return {
      userId: user.id,
      email: user.email,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const suffix = createHash('sha1').update(randomBytes(8)).digest('hex').slice(0, 6);
    return `${base || 'org'}-${suffix}`;
  }
}
