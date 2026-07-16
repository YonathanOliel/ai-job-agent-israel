import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Resume, ResumeFileType, ResumeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MalwareScanner } from '../security/malware-scanner.types';
import type { StorageProvider } from '../storage/storage.types';
import { FileValidationService } from './file-validation.service';
import { ResumesService } from './resumes.service';

describe('ResumesService', () => {
  const resumeRow: Resume = {
    id: 'r1',
    userId: 'u1',
    fileName: 'resume.pdf',
    fileType: ResumeFileType.PDF,
    storageKey: 'resumes/u1/abc.pdf',
    fileSize: 10,
    checksum: 'checksum',
    status: ResumeStatus.UPLOADED,
    language: null,
    rawText: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let prisma: { resume: Record<string, jest.Mock> };
  let fileValidation: jest.Mocked<FileValidationService>;
  let storage: jest.Mocked<StorageProvider>;
  let scanner: jest.Mocked<MalwareScanner>;
  let service: ResumesService;

  beforeEach(() => {
    prisma = {
      resume: {
        create: jest.fn().mockResolvedValue(resumeRow),
        findMany: jest.fn().mockResolvedValue([resumeRow]),
        findFirst: jest.fn().mockResolvedValue(resumeRow),
        delete: jest.fn().mockResolvedValue(resumeRow),
      },
    };
    fileValidation = {
      validate: jest.fn().mockReturnValue({
        fileType: ResumeFileType.PDF,
        contentType: 'application/pdf',
        extension: 'pdf',
      }),
    } as unknown as jest.Mocked<FileValidationService>;
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getStream: jest.fn(),
      getBuffer: jest.fn(),
    };
    scanner = { scan: jest.fn().mockResolvedValue({ clean: true }) };
    service = new ResumesService(
      prisma as unknown as PrismaService,
      fileValidation,
      storage,
      scanner,
    );
  });

  const file = { originalName: 'resume.pdf', buffer: Buffer.from('%PDF-1.7 data') };

  it('stores a validated, clean file and persists metadata', async () => {
    const result = await service.upload('u1', file);

    expect(scanner.scan).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'application/pdf' }),
    );
    expect(prisma.resume.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', fileType: ResumeFileType.PDF }),
      }),
    );
    expect(result.id).toBe('r1');
  });

  it('rejects infected files before storing them', async () => {
    scanner.scan.mockResolvedValue({ clean: false, signature: 'EICAR-Test-Signature' });

    await expect(service.upload('u1', file)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(storage.put).not.toHaveBeenCalled();
    expect(prisma.resume.create).not.toHaveBeenCalled();
  });

  it('rolls back the stored object if persistence fails', async () => {
    prisma.resume.create.mockRejectedValue(new Error('db down'));

    await expect(service.upload('u1', file)).rejects.toThrow('db down');
    expect(storage.put).toHaveBeenCalled();
    const storedKey = (storage.put.mock.calls[0]![0] as { key: string }).key;
    expect(storage.delete).toHaveBeenCalledWith(storedKey);
  });

  it('throws when deleting a resume the user does not own', async () => {
    prisma.resume.findFirst.mockResolvedValue(null);

    await expect(service.remove('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('deletes storage object and row when removing an owned resume', async () => {
    await service.remove('u1', 'r1');

    expect(storage.delete).toHaveBeenCalledWith('resumes/u1/abc.pdf');
    expect(prisma.resume.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
