import { Module } from '@nestjs/common';
import { DeterministicMatchScorer } from './deterministic-match.scorer';
import { MatchInsightService } from './match-insight.service';
import { MATCH_SCORER } from './match-score.types';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { SemanticMatchScorer } from './semantic-match.scorer';

@Module({
  controllers: [MatchingController],
  providers: [
    DeterministicMatchScorer,
    SemanticMatchScorer,
    // SemanticMatchScorer degrades to the exact deterministic result when
    // embeddings are disabled, so it is always safe to use as the active scorer.
    { provide: MATCH_SCORER, useExisting: SemanticMatchScorer },
    MatchingService,
    MatchInsightService,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
