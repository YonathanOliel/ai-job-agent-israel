import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { EmbeddingProviderError } from './embedding-provider.types';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

describe('OpenAiEmbeddingProvider', () => {
  const buildConfig = (apiKey?: string): ConfigService<Env, true> => {
    const values: Record<string, unknown> = {
      OPENAI_API_KEY: apiKey,
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
      AI_REQUEST_TIMEOUT_MS: 30000,
    };
    return { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
  };

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws when the API key is missing', async () => {
    const provider = new OpenAiEmbeddingProvider(buildConfig(undefined));
    await expect(provider.embed('hello')).rejects.toBeInstanceOf(EmbeddingProviderError);
  });

  it('returns the embedding vector on success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiEmbeddingProvider(buildConfig('sk-test'));
    const result = await provider.embed('senior backend engineer');

    expect(result).toEqual([0.1, 0.2, 0.3]);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.model).toBe('text-embedding-3-small');
    expect(body.input).toBe('senior backend engineer');
  });

  it('wraps a non-OK response in an EmbeddingProviderError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limited' } }),
    }) as unknown as typeof fetch;

    const provider = new OpenAiEmbeddingProvider(buildConfig('sk-test'));
    await expect(provider.embed('hi')).rejects.toThrow(/429/);
  });

  it('wraps network failures in an EmbeddingProviderError', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const provider = new OpenAiEmbeddingProvider(buildConfig('sk-test'));
    await expect(provider.embed('hi')).rejects.toBeInstanceOf(EmbeddingProviderError);
  });

  it('throws when the response has no embedding data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    const provider = new OpenAiEmbeddingProvider(buildConfig('sk-test'));
    await expect(provider.embed('hi')).rejects.toBeInstanceOf(EmbeddingProviderError);
  });
});
