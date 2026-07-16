import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { LanguageCode, Resume, ResumeFileType, ResumeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { StorageProvider } from '../../storage/storage.types';
import { LanguageDetectionService } from './language-detection.service';
import { ResumeParsingService } from './resume-parsing.service';
import { TextExtractionService } from './text-extraction.service';

describe('ResumeParsingService', () => {
  const resume: Resume = {
    id: 'r1',
    userId: 'u1',
    fileName: 'resume.pdf',
    fileType: ResumeFileType.PDF,
    storageKey: 'resumes/u1/abc.pdf',
    fileSize: 100,
    checksum: 'checksum',
    status: ResumeStatus.UPLOADED,
    language: null,
    rawText: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let prisma: { resume: { findFirst: jest.Mock; update: jest.Mock } };
  let textExtraction: jest.Mocked<TextExtractionService>;
  let languageDetection: jest.Mocked<LanguageDetectionService>;
  let storage: jest.Mocked<StorageProvider>;
  let service: ResumeParsingService;

  beforeEach(() => {
    prisma = {
      resume: {
        findFirst: jest.fn().mockResolvedValue(resume),
        update: jest.fn(({ data }: { data: Partial<Resume> }) =>
          Promise.resolve({ ...resume, ...data }),
        ),
      },
    };
    textExtraction = { extract: jest.fn() } as unknown as jest.Mocked<TextExtractionService>;
    languageDetection = {
      detect: jest.fn().mockReturnValue(LanguageCode.EN),
    } as unknown as jest.Mocked<LanguageDetectionService>;
    storage = {
      getBuffer: jest.fn().mockResolvedValue(Buffer.from('file')),
      getStream: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    service = new ResumeParsingService(
      prisma as unknown as PrismaService,
      textExtraction,
      languageDetection,
      storage,
    );
  });

  it('extracts text, detects language, and marks the resume parsed', async () => {
    textExtraction.extract.mockResolvedValue('Backend Engineer with 8 years of experience');

    const result = await service.parse('u1', 'r1');

    expect(result.status).toBe(ResumeStatus.PARSED);
    expect(result.language).toBe(LanguageCode.EN);
    expect(result.textLength).toBeGreaterThan(0);
    expect(prisma.resume.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ResumeStatus.PARSED, language: LanguageCode.EN }),
      }),
    );
  });

  it('throws when the resume is not owned by the user', async () => {
    prisma.resume.findFirst.mockResolvedValue(null);

    await expect(service.parse('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });

  it('marks the resume failed when no text can be extracted', async () => {
    textExtraction.extract.mockResolvedValue('   ');

    await expect(service.parse('u1', 'r1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.resume.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { status: ResumeStatus.FAILED } }),
    );
  });
});
