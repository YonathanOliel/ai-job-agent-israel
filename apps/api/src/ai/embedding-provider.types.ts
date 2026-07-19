/** DI token for the active {@link EmbeddingProvider} implementation (or null when disabled). */
export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

/**
 * Provider-agnostic text-embedding interface. Implementations (OpenAI,
 * Cohere, ...) are interchangeable behind the {@link EMBEDDING_PROVIDER}
 * token. The token resolves to `null` when no embedding provider is
 * configured, so callers must treat embeddings as an optional feature.
 */
export interface EmbeddingProvider {
  /** Human-readable provider name (e.g. "openai"). */
  readonly name: string;
  /** Dimensionality of the vectors this provider returns. */
  readonly dimensions: number;
  /** Embeds a single piece of text into a dense vector. */
  embed(text: string): Promise<number[]>;
}

/** Raised when an embedding provider cannot fulfil a request. */
export class EmbeddingProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'EmbeddingProviderError';
  }
}
