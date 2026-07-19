import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { EmbeddingProviderError, type EmbeddingProvider } from './embedding-provider.types';

interface OpenAiEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

/** Dimensionality of OpenAI's `text-embedding-3-small` model. */
const TEXT_EMBEDDING_3_SMALL_DIMENSIONS = 1536;

/**
 * OpenAI Embeddings provider. Uses the REST API directly (via `fetch`),
 * consistent with {@link OpenAiProvider} for completions.
 */
@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions = TEXT_EMBEDDING_3_SMALL_DIMENSIONS;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async embed(text: string): Promise<number[]> {
    const apiKey = this.config.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new EmbeddingProviderError('OPENAI_API_KEY is not configured', this.name);
    }

    const baseUrl = this.config.get('OPENAI_BASE_URL', { infer: true });
    const model = this.config.get('OPENAI_EMBEDDING_MODEL', { infer: true });
    const timeoutMs = this.config.get('AI_REQUEST_TIMEOUT_MS', { infer: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, input: text }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as OpenAiEmbeddingResponse;
      if (!response.ok) {
        throw new EmbeddingProviderError(
          `OpenAI embeddings request failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
          this.name,
        );
      }

      const vector = payload.data?.[0]?.embedding;
      if (!vector || vector.length === 0) {
        throw new EmbeddingProviderError('OpenAI returned an empty embedding', this.name);
      }
      return vector;
    } catch (error) {
      if (error instanceof EmbeddingProviderError) {
        throw error;
      }
      throw new EmbeddingProviderError(
        'OpenAI embeddings request could not be completed',
        this.name,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
