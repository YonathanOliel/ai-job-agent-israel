import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AdminService,
  type AdminAuditList,
  type AdminOverview,
  type AdminSession,
  type AdminUserList,
} from './admin.service';
import { ListAuditDto } from './dto/list-audit.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SetRoleDto } from './dto/set-role.dto';

/**
 * Super-Admin console API. Every route requires SUPER_ADMIN — the single owner
 * account. Authorization is enforced here on the backend (never trust the UI).
 */
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview(): Promise<AdminOverview> {
    return this.admin.overview();
  }

  @Get('sessions')
  sessions(): Promise<AdminSession[]> {
    return this.admin.listSessions();
  }

  @Get('users')
  users(@Query() query: ListUsersDto): Promise<AdminUserList> {
    return this.admin.listUsers(query);
  }

  @Get('audit')
  audit(@Query() query: ListAuditDto): Promise<AdminAuditList> {
    return this.admin.listAudit(query);
  }

  @Post('sessions/:userId/revoke')
  @HttpCode(HttpStatus.OK)
  revoke(@Param('userId', ParseUUIDPipe) userId: string): Promise<{ revoked: number }> {
    return this.admin.revokeUserSessions(userId);
  }

  @Post('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  setRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: SetRoleDto,
  ): Promise<{ id: string; role: UserRole }> {
    return this.admin.setRole(userId, body.role);
  }
}
