import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BillingService } from './billing.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const buildBilling = () =>
    ({ assertCanAddMember: jest.fn().mockResolvedValue(undefined) }) as unknown as BillingService;
  const buildPrisma = () => ({
    organization: {
      create: jest.fn().mockResolvedValue({ id: 'o1', name: 'Acme', slug: 'acme-abc123' }),
    },
    organizationMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  });

  it('creates an org with the creator as OWNER', async () => {
    const prisma = buildPrisma();
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
      {} as unknown as UsersService,
      buildBilling(),
    );

    await service.create('user-1', 'Acme');

    const args = prisma.organization.create.mock.calls[0]![0];
    expect(args.data.name).toBe('Acme');
    expect(args.data.slug).toMatch(/^acme-[0-9a-f]{6}$/);
    expect(args.data.memberships.create).toEqual({ userId: 'user-1', role: OrgRole.OWNER });
  });

  it('enforces tenant isolation: non-members get NotFound', async () => {
    const prisma = buildPrisma();
    prisma.organizationMembership.findUnique.mockResolvedValue(null);
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
      {} as unknown as UsersService,
      buildBilling(),
    );

    await expect(service.requireMembership('intruder', 'o1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forbids plain members from adding members', async () => {
    const prisma = buildPrisma();
    prisma.organizationMembership.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
      {} as unknown as UsersService,
      buildBilling(),
    );

    await expect(
      service.addMember('member-1', 'o1', 'new@example.com', OrgRole.MEMBER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an admin add an existing user as a member', async () => {
    const prisma = buildPrisma();
    prisma.organizationMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN });
    prisma.organizationMembership.upsert.mockResolvedValue({
      role: OrgRole.MEMBER,
      createdAt: new Date('2026-07-19T00:00:00Z'),
    });
    const users = {
      findByEmail: jest.fn().mockResolvedValue({ id: 'u2', email: 'new@example.com' }),
    };
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
      buildBilling(),
    );

    const member = await service.addMember('admin-1', 'o1', 'new@example.com', OrgRole.MEMBER);

    expect(member).toEqual({
      userId: 'u2',
      email: 'new@example.com',
      role: OrgRole.MEMBER,
      createdAt: new Date('2026-07-19T00:00:00Z'),
    });
    expect(prisma.organizationMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_userId: { organizationId: 'o1', userId: 'u2' } },
      }),
    );
  });
});
