import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { UsersService } from '../users/users.service';

/**
 * Promotes the configured owner (SUPER_ADMIN_EMAIL) to SUPER_ADMIN on startup,
 * so an already-registered owner gains console access without re-registering.
 */
@Injectable()
export class AdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrap.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly users: UsersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get('SUPER_ADMIN_EMAIL', { infer: true });
    if (!email) {
      return;
    }
    try {
      const promoted = await this.users.setRoleByEmail(email, UserRole.SUPER_ADMIN);
      if (promoted > 0) {
        this.logger.log(`Owner ${email} confirmed as SUPER_ADMIN`);
      }
    } catch (error) {
      this.logger.warn(`Owner bootstrap skipped: ${(error as Error).message}`);
    }
  }
}
