import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { AiProviderError } from './ai-provider.types';
import { OpenAiProvider } from './openai.provider';

describe('OpenAiProvider', () => {
  const buildConfig = (apiKey?: string): ConfigService<Env, true> => {
    const values: Record<string, unknown> = {
      OPENAI_API_KEY: apiKey,
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o-mini',
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
    const provider = new OpenAiProvider(buildConfig(undefined));
    await expect(provider.complete({ prompt: 'hi' })).rejects.toBeInstanceOf(AiProviderError);
  });

  it('returns the completion content on success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(buildConfig('sk-test'));
    const result = await provider.complete({ prompt: 'extract', json: true });

    expect(result).toBe('{"ok":true}');
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.model).toBe('gpt-4o-mini');
  });

  it('wraps a non-OK response in an AiProviderError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limited' } }),
    }) as unknown as typeof fetch;

    const provider = new OpenAiProvider(buildConfig('sk-test'));
    await expect(provider.complete({ prompt: 'hi' })).rejects.toThrow(/429/);
  });

  it('wraps network failures in an AiProviderError', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const provider = new OpenAiProvider(buildConfig('sk-test'));
    await expect(provider.complete({ prompt: 'hi' })).rejects.toBeInstanceOf(AiProviderError);
  });
});
