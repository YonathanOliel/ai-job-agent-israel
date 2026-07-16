import { LanguageCode } from '@prisma/client';
import { LanguageDetectionService } from './language-detection.service';

describe('LanguageDetectionService', () => {
  const service = new LanguageDetectionService();

  it('detects English text', () => {
    expect(service.detect('Senior Backend Engineer with 8 years of experience')).toBe(
      LanguageCode.EN,
    );
  });

  it('detects Hebrew text', () => {
    expect(service.detect('מהנדס תוכנה בכיר עם שמונה שנות ניסיון בפיתוח')).toBe(LanguageCode.HE);
  });

  it('detects Hebrew in mixed text when Hebrew dominates', () => {
    expect(service.detect('מפתח Full Stack עם ניסיון רב בעברית ובאנגלית מעט')).toBe(
      LanguageCode.HE,
    );
  });

  it('defaults to English for text without letters', () => {
    expect(service.detect('1234 !@#$ ----')).toBe(LanguageCode.EN);
  });
});
