import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { CareerProfileController } from './career-profile.controller';
import { CareerProfileService } from './career-profile.service';
import { HeuristicProfileExtractor } from './heuristic-profile.extractor';
import { LlmProfileExtractor } from './llm-profile.extractor';
import { PROFILE_EXTRACTOR, type ProfileExtractor } from './profile-extractor.types';

@Module({
  controllers: [CareerProfileController],
  providers: [
    HeuristicProfileExtractor,
    LlmProfileExtractor,
    {
      provide: PROFILE_EXTRACTOR,
      inject: [ConfigService, HeuristicProfileExtractor, LlmProfileExtractor],
      useFactory: (
        config: ConfigService<Env, true>,
        heuristic: HeuristicProfileExtractor,
        llm: LlmProfileExtractor,
      ): ProfileExtractor =>
        config.get('PROFILE_EXTRACTOR', { infer: true }) === 'llm' ? llm : heuristic,
    },
    CareerProfileService,
  ],
  exports: [CareerProfileService],
})
export class CareerProfileModule {}
