import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

/**
 * Global module exposing {@link EmbeddingService} to jobs, career-profile,
 * and matching without each needing an explicit import (mirrors AiModule).
 */
@Global()
@Module({
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingsModule {}
