import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { JobsModule } from '../jobs/jobs.module';
import { HeuristicReferralExtractor } from './heuristic-referral.extractor';
import { LlmReferralExtractor } from './llm-referral.extractor';
import { REFERRAL_EXTRACTOR, type ReferralExtractor } from './referral-extractor.types';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [JobsModule],
  controllers: [ReferralsController],
  providers: [
    HeuristicReferralExtractor,
    LlmReferralExtractor,
    {
      provide: REFERRAL_EXTRACTOR,
      inject: [ConfigService, HeuristicReferralExtractor, LlmReferralExtractor],
      useFactory: (
        config: ConfigService<Env, true>,
        heuristic: HeuristicReferralExtractor,
        llm: LlmReferralExtractor,
      ): ReferralExtractor =>
        config.get('REFERRAL_EXTRACTOR', { infer: true }) === 'llm' ? llm : heuristic,
    },
    ReferralsService,
  ],
})
export class ReferralsModule {}
