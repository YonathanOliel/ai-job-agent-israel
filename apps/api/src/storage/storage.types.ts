import type { Readable } from 'node:stream';

/** DI token for the active {@link StorageProvider} implementation. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Object-storage abstraction. Implementations (S3/MinIO, local, ...) are
 * interchangeable so callers never depend on a specific backend.
 */
export interface StorageProvider {
  put(input: PutObjectInput): Promise<void>;
  getStream(key: string): Promise<Readable>;
  getBuffer(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
