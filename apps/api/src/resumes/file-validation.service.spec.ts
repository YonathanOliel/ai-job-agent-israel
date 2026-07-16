import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { ResumeFileType } from '@prisma/client';
import { FileValidationService } from './file-validation.service';

describe('FileValidationService', () => {
  const build = (maxBytes = 1024): FileValidationService =>
    new FileValidationService({ get: () => maxBytes } as never);

  it('accepts a valid PDF', () => {
    const service = build();
    const buffer = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('content')]);
    const result = service.validate('resume.pdf', buffer);
    expect(result.fileType).toBe(ResumeFileType.PDF);
    expect(result.contentType).toBe('application/pdf');
  });

  it('accepts a plain-text file', () => {
    const service = build();
    const result = service.validate('קורות-חיים.txt', Buffer.from('Shalom, this is text'));
    expect(result.fileType).toBe(ResumeFileType.TXT);
  });

  it('accepts a DOCX (zip signature)', () => {
    const service = build();
    const buffer = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('rest')]);
    expect(service.validate('cv.docx', buffer).fileType).toBe(ResumeFileType.DOCX);
  });

  it('rejects an empty file', () => {
    expect(() => build().validate('resume.pdf', Buffer.alloc(0))).toThrow(BadRequestException);
  });

  it('rejects an oversized file', () => {
    const service = build(4);
    const buffer = Buffer.from('%PDF-larger-than-limit');
    expect(() => service.validate('resume.pdf', buffer)).toThrow(PayloadTooLargeException);
  });

  it('rejects an unsupported extension', () => {
    expect(() => build().validate('resume.exe', Buffer.from('MZ'))).toThrow(BadRequestException);
  });

  it('rejects content that does not match its extension', () => {
    const service = build();
    expect(() => service.validate('resume.pdf', Buffer.from('not a pdf'))).toThrow(
      BadRequestException,
    );
  });
});
