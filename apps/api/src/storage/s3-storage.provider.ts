import { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { PutObjectInput, StorageProvider } from './storage.types';

/**
 * S3-compatible storage provider. Works against AWS S3 or MinIO (path-style
 * addressing). Ensures the target bucket exists on startup.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.bucket = this.config.get('STORAGE_BUCKET', { infer: true });
    this.client = new S3Client({
      endpoint: this.config.get('STORAGE_ENDPOINT', { infer: true }),
      region: this.config.get('STORAGE_REGION', { infer: true }),
      credentials: {
        accessKeyId: this.config.get('STORAGE_ACCESS_KEY', { infer: true }),
        secretAccessKey: this.config.get('STORAGE_SECRET_KEY', { infer: true }),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created storage bucket "${this.bucket}"`);
    }
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getStream(key: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return result.Body as Readable;
  }

  async getBuffer(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await result.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
