import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { AdminBootstrap } from './admin-bootstrap.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Super-Admin console module. Reuses jobs stats/source-registry and the global
 * search service to present a single operational view for the owner only.
 */
@Module({
  imports: [JobsModule, UsersModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService, AdminBootstrap],
})
export class AdminModule {}
