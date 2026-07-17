import { Module } from '@nestjs/common';
import { DeterministicMatchScorer } from './deterministic-match.scorer';
import { MATCH_SCORER } from './match-score.types';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  controllers: [MatchingController],
  providers: [
    DeterministicMatchScorer,
    { provide: MATCH_SCORER, useExisting: DeterministicMatchScorer },
    MatchingService,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
