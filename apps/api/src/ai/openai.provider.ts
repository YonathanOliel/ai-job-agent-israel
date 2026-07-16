import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { AiProviderError, type AiCompletionRequest, type AiProvider } from './ai-provider.types';

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

/**
 * OpenAI Chat Completions provider. Uses the REST API directly (via `fetch`) to
 * avoid a heavyweight SDK dependency.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';

  constructor(private readonly config: ConfigService<Env, true>) {}

  async complete(request: AiCompletionRequest): Promise<string> {
    const apiKey = this.config.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new AiProviderError('OPENAI_API_KEY is not configured', this.name);
    }

    const baseUrl = this.config.get('OPENAI_BASE_URL', { infer: true });
    const model = this.config.get('OPENAI_MODEL', { infer: true });
    const timeoutMs = this.config.get('AI_REQUEST_TIMEOUT_MS', { infer: true });

    const messages = [
      ...(request.system ? [{ role: 'system', content: request.system }] : []),
      { role: 'user', content: request.prompt },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature ?? 0.2,
          ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
          ...(request.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as OpenAiChatResponse;
      if (!response.ok) {
        throw new AiProviderError(
          `OpenAI request failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
          this.name,
        );
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new AiProviderError('OpenAI returned an empty completion', this.name);
      }
      return content;
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      throw new AiProviderError('OpenAI request could not be completed', this.name, error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
