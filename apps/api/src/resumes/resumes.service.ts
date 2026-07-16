import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Resume, ResumeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MALWARE_SCANNER, type MalwareScanner } from '../security/malware-scanner.types';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.types';
import { FileValidationService } from './file-validation.service';
import type { ResumeSummary } from './types/resume.types';

export interface UploadedFile {
  originalName: string;
  buffer: Buffer;
}

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileValidation: FileValidationService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(MALWARE_SCANNER) private readonly scanner: MalwareScanner,
  ) {}

  async upload(userId: string, file: UploadedFile): Promise<ResumeSummary> {
    const fileName = this.normalizeFileName(file.originalName);
    const validated = this.fileValidation.validate(fileName, file.buffer);

    const scan = await this.scanner.scan(file.buffer);
    if (!scan.clean) {
      throw new UnprocessableEntityException(`File rejected by malware scan: ${scan.signature}`);
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `resumes/${userId}/${randomUUID()}.${validated.extension}`;

    await this.storage.put({
      key: storageKey,
      body: file.buffer,
      contentType: validated.contentType,
    });

    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          fileName,
          fileType: validated.fileType,
          storageKey,
          fileSize: file.buffer.length,
          checksum,
          status: ResumeStatus.UPLOADED,
        },
      });
      return this.toSummary(resume);
    } catch (error) {
      // Roll back the stored object so storage and DB stay consistent.
      await this.storage.delete(storageKey).catch((cleanupError) => {
        this.logger.error(`Failed to clean up orphaned object ${storageKey}`, cleanupError);
      });
      throw error;
    }
  }

  async list(userId: string): Promise<ResumeSummary[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return resumes.map((resume) => this.toSummary(resume));
  }

  async download(userId: string, id: string): Promise<{ resume: Resume; stream: Readable }> {
    const resume = await this.getOwnedOrThrow(userId, id);
    const stream = await this.storage.getStream(resume.storageKey);
    return { resume, stream };
  }

  async remove(userId: string, id: string): Promise<void> {
    const resume = await this.getOwnedOrThrow(userId, id);
    await this.storage.delete(resume.storageKey).catch((error) => {
      this.logger.error(`Failed to delete object ${resume.storageKey}`, error);
    });
    await this.prisma.resume.delete({ where: { id: resume.id } });
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<Resume> {
    const resume = await this.prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    return resume;
  }

  /** Multer decodes multipart filenames as latin1; restore UTF-8 (Hebrew) names. */
  private normalizeFileName(name: string): string {
    return Buffer.from(name, 'latin1').toString('utf8');
  }

  private toSummary(resume: Resume): ResumeSummary {
    return {
      id: resume.id,
      fileName: resume.fileName,
      fileType: resume.fileType,
      fileSize: resume.fileSize,
      status: resume.status,
      language: resume.language,
      createdAt: resume.createdAt,
    };
  }
}
