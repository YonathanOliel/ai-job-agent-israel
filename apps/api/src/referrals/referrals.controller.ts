import { Body, Controller, Get, Post } from '@nestjs/common';
import { JobReferral } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { SubmitReferralDto } from './dto/submit-referral.dto';
import { ReferralsService } from './referrals.service';

/**
 * User-submitted job referrals: a compliant alternative to scraping LinkedIn
 * or Facebook groups. Any authenticated user can share a posting they saw.
 */
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Post()
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SubmitReferralDto,
  ): Promise<JobReferral> {
    return this.referrals.submit(user.id, body);
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<JobReferral[]> {
    return this.referrals.listMine(user.id);
  }
}
