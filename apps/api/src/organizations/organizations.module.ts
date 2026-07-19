import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BillingService } from './billing.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [UsersModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, BillingService],
  exports: [OrganizationsService, BillingService],
})
export class OrganizationsModule {}
