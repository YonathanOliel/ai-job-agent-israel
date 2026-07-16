import { Global, Module } from '@nestjs/common';
import { S3StorageProvider } from './s3-storage.provider';
import { STORAGE_PROVIDER } from './storage.types';

/**
 * Binds the {@link STORAGE_PROVIDER} token to the S3-compatible implementation.
 * Swap the `useClass` here to change backends without touching consumers.
 */
@Global()
@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: S3StorageProvider }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
