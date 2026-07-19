import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  CareerProfile,
  LanguageCode,
  Resume,
  ResumeFileType,
  ResumeStatus,
  SeniorityLevel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { CareerProfileService } from './career-profile.service';
import type { ProfileExtractor } from './profile-extractor.types';
import type { StructuredProfile } from './structured-profile.schema';

describe('CareerProfileService', () => {
  const parsedResume: Resume = {
    id: 'r1',
    userId: 'u1',
    fileName: 'resume.pdf',
    fileType: ResumeFileType.PDF,
    storageKey: 'resumes/u1/abc.pdf',
    fileSize: 100,
    checksum: 'c',
    status: ResumeStatus.PARSED,
    language: LanguageCode.EN,
    rawText: 'Senior Backend Engineer with 8 years',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const structured: StructuredProfile = {
    headline: 'Senior Backend Engineer',
    summary: 'Experienced developer',
    yearsExperience: 8,
    seniority: SeniorityLevel.SENIOR,
    desiredRoles: [],
    skills: ['Leadership'],
    technologies: ['typescript'],
    industries: [],
    preferredLocations: [],
    languages: [{ name: 'English' }],
    education: [],
    experience: [],
    certifications: [],
    projects: [],
  };

  let prisma: {
    resume: { findFirst: jest.Mock };
    careerProfile: { upsert: jest.Mock; findUnique: jest.Mock };
  };
  let embeddings: { embedProfile: jest.Mock };
  let extractor: jest.Mocked<ProfileExtractor>;
  let service: CareerProfileService;

  beforeEach(() => {
    prisma = {
      resume: { findFirst: jest.fn().mockResolvedValue(parsedResume) },
      careerProfile: {
        upsert: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' } as CareerProfile),
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' } as CareerProfile),
      },
    };
    embeddings = { embedProfile: jest.fn().mockResolvedValue(undefined) };
    extractor = {
      name: 'heuristic',
      extract: jest.fn().mockResolvedValue(structured),
    };
    service = new CareerProfileService(
      prisma as unknown as PrismaService,
      embeddings as unknown as EmbeddingService,
      extractor,
    );
  });

  it('generates and upserts a profile from a parsed resume', async () => {
    const result = await service.generate('u1', 'r1');

    expect(extractor.extract).toHaveBeenCalledWith(parsedResume.rawText, LanguageCode.EN);
    expect(prisma.careerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        create: expect.objectContaining({ userId: 'u1', seniority: SeniorityLevel.SENIOR }),
      }),
    );
    expect(result.id).toBe('p1');
  });

  it('throws when the resume does not exist', async () => {
    prisma.resume.findFirst.mockResolvedValue(null);
    await expect(service.generate('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the resume has not been parsed', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      ...parsedResume,
      status: ResumeStatus.UPLOADED,
      rawText: null,
    });
    await expect(service.generate('u1', 'r1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.careerProfile.upsert).not.toHaveBeenCalled();
  });

  it('returns the existing profile', async () => {
    await expect(service.get('u1')).resolves.toEqual(expect.objectContaining({ id: 'p1' }));
  });

  it('throws when no profile exists', async () => {
    prisma.careerProfile.findUnique.mockResolvedValue(null);
    await expect(service.get('u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
