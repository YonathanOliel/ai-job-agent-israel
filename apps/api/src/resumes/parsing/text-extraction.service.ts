import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ResumeFileType } from '@prisma/client';
import { DocxTextExtractor } from './docx-text.extractor';
import { PdfTextExtractor } from './pdf-text.extractor';
import type { TextExtractor } from './text-extractor.types';
import { TxtTextExtractor } from './txt-text.extractor';

/**
 * Selects the appropriate {@link TextExtractor} for a file type and normalizes
 * the resulting text. Legacy DOC is not yet supported for parsing.
 */
@Injectable()
export class TextExtractionService {
  private readonly extractors: Partial<Record<ResumeFileType, TextExtractor>>;

  constructor(pdf: PdfTextExtractor, docx: DocxTextExtractor, txt: TxtTextExtractor) {
    this.extractors = {
      [ResumeFileType.PDF]: pdf,
      [ResumeFileType.DOCX]: docx,
      [ResumeFileType.TXT]: txt,
    };
  }

  async extract(fileType: ResumeFileType, buffer: Buffer): Promise<string> {
    const extractor = this.extractors[fileType];
    if (!extractor) {
      throw new UnprocessableEntityException(
        `Text extraction is not yet supported for ${fileType} files`,
      );
    }
    return this.normalize(await extractor.extract(buffer));
  }

  /** Normalizes line endings and collapses excessive blank space. */
  private normalize(text: string): string {
    return text
      .replace(/\r\n?/g, '\n')
      .replaceAll('\u0000', '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
