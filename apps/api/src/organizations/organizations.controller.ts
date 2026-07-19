import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService, type OrgMember } from './organizations.service';

/**
 * Multi-tenant organizations API. Any authenticated user can create an org
 * (becoming its owner); all other routes are scoped to org membership.
 */
@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.orgs.create(user.id, body.name);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Organization[]> {
    return this.orgs.listForUser(user.id);
  }

  @Get(':orgId/members')
  members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<OrgMember[]> {
    return this.orgs.listMembers(user.id, orgId);
  }

  @Post(':orgId/members')
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() body: AddMemberDto,
  ): Promise<OrgMember> {
    return this.orgs.addMember(user.id, orgId, body.email, body.role);
  }
}
