import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResumeFileType } from '@prisma/client';
import type { Env } from '../config/env.validation';

export interface ValidatedFile {
  fileType: ResumeFileType;
  contentType: string;
  extension: string;
}

const EXTENSION_TO_TYPE: Record<string, ResumeFileType> = {
  pdf: ResumeFileType.PDF,
  docx: ResumeFileType.DOCX,
  doc: ResumeFileType.DOC,
  txt: ResumeFileType.TXT,
};

const CONTENT_TYPE: Record<ResumeFileType, string> = {
  [ResumeFileType.PDF]: 'application/pdf',
  [ResumeFileType.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  [ResumeFileType.DOC]: 'application/msword',
  [ResumeFileType.TXT]: 'text/plain; charset=utf-8',
};

/**
 * Validates uploaded resume files by size, extension, and — critically — actual
 * file content (magic bytes), so a mislabeled or disguised file is rejected.
 */
@Injectable()
export class FileValidationService {
  private readonly maxBytes: number;

  constructor(config: ConfigService<Env, true>) {
    this.maxBytes = config.get('UPLOAD_MAX_BYTES', { infer: true });
  }

  validate(fileName: string, buffer: Buffer): ValidatedFile {
    if (buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
    if (buffer.length > this.maxBytes) {
      throw new PayloadTooLargeException(`File exceeds the ${this.maxBytes}-byte limit`);
    }

    const extension = this.extractExtension(fileName);
    const declaredType = EXTENSION_TO_TYPE[extension];
    if (!declaredType) {
      throw new BadRequestException('Unsupported file type. Allowed: PDF, DOCX, DOC, TXT');
    }

    if (!this.matchesSignature(declaredType, buffer)) {
      throw new BadRequestException(`File content does not match its .${extension} extension`);
    }

    return { fileType: declaredType, contentType: CONTENT_TYPE[declaredType], extension };
  }

  private extractExtension(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
  }

  private matchesSignature(type: ResumeFileType, buffer: Buffer): boolean {
    switch (type) {
      case ResumeFileType.PDF:
        return this.startsWith(buffer, [0x25, 0x50, 0x44, 0x46]); // %PDF
      case ResumeFileType.DOCX:
        return this.startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]); // PK.. (zip/OOXML)
      case ResumeFileType.DOC:
        return this.startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // OLE
      case ResumeFileType.TXT:
        return this.isProbablyText(buffer);
    }
  }

  private startsWith(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) {
      return false;
    }
    return signature.every((byte, index) => buffer[index] === byte);
  }

  private isProbablyText(buffer: Buffer): boolean {
    // Reject binary content: a NUL byte in the sampled head indicates non-text.
    const sample = buffer.subarray(0, 4096);
    return !sample.includes(0x00);
  }
}
