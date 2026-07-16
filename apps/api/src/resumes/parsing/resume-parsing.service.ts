import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Resume, ResumeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../storage/storage.types';
import { LanguageDetectionService } from './language-detection.service';
import type { ResumeParseResult } from './resume-parse-result.type';
import { TextExtractionService } from './text-extraction.service';

const PREVIEW_LENGTH = 300;

@Injectable()
export class ResumeParsingService {
  private readonly logger = new Logger(ResumeParsingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly textExtraction: TextExtractionService,
    private readonly languageDetection: LanguageDetectionService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async parse(userId: string, resumeId: string): Promise<ResumeParseResult> {
    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.prisma.resume.update({
      where: { id: resume.id },
      data: { status: ResumeStatus.PARSING },
    });

    try {
      const buffer = await this.storage.getBuffer(resume.storageKey);
      const text = await this.textExtraction.extract(resume.fileType, buffer);

      if (!text.trim()) {
        throw new UnprocessableEntityException('No extractable text found in the resume');
      }

      const language = this.languageDetection.detect(text);
      const updated = await this.prisma.resume.update({
        where: { id: resume.id },
        data: { rawText: text, language, status: ResumeStatus.PARSED },
      });
      return this.toResult(updated, text);
    } catch (error) {
      await this.markFailed(resume.id);
      this.logger.warn(`Failed to parse resume ${resume.id}: ${(error as Error).message}`);
      throw error;
    }
  }

  private async markFailed(id: string): Promise<void> {
    await this.prisma.resume
      .update({ where: { id }, data: { status: ResumeStatus.FAILED } })
      .catch((error) => this.logger.error(`Could not mark resume ${id} as failed`, error));
  }

  private toResult(resume: Resume, text: string): ResumeParseResult {
    return {
      id: resume.id,
      status: resume.status,
      language: resume.language,
      textLength: text.length,
      preview: text.slice(0, PREVIEW_LENGTH),
    };
  }
}
