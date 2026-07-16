/** DI token for the active {@link AiProvider} implementation. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiCompletionRequest {
  /** Optional system instruction that sets the model's behavior. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** Sampling temperature (0 = deterministic). Defaults to the provider's choice. */
  temperature?: number;
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
  /** When true, instruct the model to return a single JSON object. */
  json?: boolean;
}

/**
 * Provider-agnostic large-language-model interface. Implementations (OpenAI,
 * Anthropic, Gemini, ...) are interchangeable behind the {@link AI_PROVIDER}
 * token so callers never depend on a specific vendor.
 */
export interface AiProvider {
  /** Human-readable provider name (e.g. "openai"). */
  readonly name: string;
  /** Runs a single completion and returns the model's text output. */
  complete(request: AiCompletionRequest): Promise<string>;
}

/** Raised when an AI provider cannot fulfil a request. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'AiProviderError';
  }
}
