import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { AI_PROVIDER, type AiProvider } from './ai-provider.types';
import { OpenAiProvider } from './openai.provider';

/**
 * Wires the {@link AI_PROVIDER} token to the implementation selected by
 * `AI_DEFAULT_PROVIDER`. New providers (Anthropic, Gemini) implement
 * {@link AiProvider} and are added to the switch below.
 */
@Global()
@Module({
  providers: [
    OpenAiProvider,
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
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
