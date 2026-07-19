import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { AI_PROVIDER, type AiProvider } from './ai-provider.types';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.types';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';
import { OpenAiProvider } from './openai.provider';

/**
 * Wires the {@link AI_PROVIDER} token to the implementation selected by
 * `AI_DEFAULT_PROVIDER`. New providers (Anthropic, Gemini) implement
 * {@link AiProvider} and are added to the switch below.
 *
 * Also wires {@link EMBEDDING_PROVIDER}, used by the semantic matching engine.
 * It resolves to `null` when no key is configured so embeddings are a fully
 * optional feature — matching degrades to the deterministic scorer.
 */
@Global()
@Module({
  providers: [
    OpenAiProvider,
    OpenAiEmbeddingProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, OpenAiProvider],
      useFactory: (config: ConfigService<Env, true>, openai: OpenAiProvider): AiProvider => {
        const provider = config.get('AI_DEFAULT_PROVIDER', { infer: true });
        switch (provider) {
          case 'openai':
            return openai;
          default:
            throw new Error(`AI provider "${provider}" is not implemented yet`);
        }
      },
    },
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService, OpenAiEmbeddingProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        openaiEmbeddings: OpenAiEmbeddingProvider,
      ): EmbeddingProvider | null =>
        config.get('OPENAI_API_KEY', { infer: true }) ? openaiEmbeddings : null,
    },
  ],
  exports: [AI_PROVIDER, EMBEDDING_PROVIDER],
})
export class AiModule {}
