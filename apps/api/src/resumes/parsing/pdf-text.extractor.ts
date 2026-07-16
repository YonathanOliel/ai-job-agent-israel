import { Injectable } from '@nestjs/common';
import pdf from 'pdf-parse';
import type { TextExtractor } from './text-extractor.types';

/** Extracts text from PDF resumes. */
@Injectable()
export class PdfTextExtractor implements TextExtractor {
  async extract(buffer: Buffer): Promise<string> {
    const result = await pdf(buffer);
    return result.text;
  }
}
