import { Injectable } from '@nestjs/common';
import { extractRawText } from 'mammoth';
import type { TextExtractor } from './text-extractor.types';

/** Extracts text from DOCX (Office Open XML) resumes. */
@Injectable()
export class DocxTextExtractor implements TextExtractor {
  async extract(buffer: Buffer): Promise<string> {
    const result = await extractRawText({ buffer });
    return result.value;
  }
}
