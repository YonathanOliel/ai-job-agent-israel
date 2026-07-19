import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService, type AdminOverview, type AdminSession } from './admin.service';
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
