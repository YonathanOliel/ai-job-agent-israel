import { Injectable } from '@nestjs/common';
import { LanguageCode } from '@prisma/client';

/**
 * Detects whether resume text is primarily Hebrew or English by comparing the
 * volume of Hebrew-script characters to Latin ones.
 */
@Injectable()
export class LanguageDetectionService {
  /** Minimum share of Hebrew characters (of all letters) to classify as Hebrew. */
  private static readonly HEBREW_THRESHOLD = 0.3;

  detect(text: string): LanguageCode {
    const hebrew = (text.match(/[\u0590-\u05ff]/g) ?? []).length;
    const latin = (text.match(/[a-z]/gi) ?? []).length;
    const total = hebrew + latin;

    if (total === 0) {
      return LanguageCode.EN;
    }
    return hebrew / total >= LanguageDetectionService.HEBREW_THRESHOLD
      ? LanguageCode.HE
      : LanguageCode.EN;
  }
}
