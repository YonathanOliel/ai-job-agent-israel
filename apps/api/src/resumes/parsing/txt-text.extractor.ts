import { Injectable } from '@nestjs/common';
import type { TextExtractor } from './text-extractor.types';

/** Extracts text from plain-text (UTF-8) resumes. */
@Injectable()
export class TxtTextExtractor implements TextExtractor {
  async extract(buffer: Buffer): Promise<string> {
    return buffer.toString('utf8');
  }
}
