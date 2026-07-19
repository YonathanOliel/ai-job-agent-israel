import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CareerProfile, LanguageCode, Prisma, ResumeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { PROFILE_EXTRACTOR, type ProfileExtractor } from './profile-extractor.types';
import type { StructuredProfile } from './structured-profile.schema';

@Injectable()
export class CareerProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
    @Inject(PROFILE_EXTRACTOR) private readonly extractor: ProfileExtractor,
  ) {}

  async generate(userId: string, resumeId: string): Promise<CareerProfile> {
    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    if (resume.status !== ResumeStatus.PARSED || !resume.rawText) {
      throw new UnprocessableEntityException(
        'Resume must be parsed before generating a career profile',
      );
    }

    const structured = await this.extractor.extract(
      resume.rawText,
      resume.language ?? LanguageCode.EN,
    );
    const data = this.buildData(structured, resume.id);

    const profile = await this.prisma.careerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await this.embeddings.embedProfile(profile);
    return profile;
  }

  async get(userId: string): Promise<CareerProfile> {
    const profile = await this.prisma.careerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('No career profile has been generated yet');
    }
    return profile;
  }

  private buildData(
    structured: StructuredProfile,
    sourceResumeId: string,
  ): Omit<Prisma.CareerProfileUncheckedCreateInput, 'id' | 'userId'> {
    return {
      headline: structured.headline ?? null,
      summary: structured.summary ?? null,
      yearsExperience: structured.yearsExperience ?? null,
      seniority: structured.seniority ?? null,
      desiredRoles: structured.desiredRoles,
      skills: structured.skills,
      technologies: structured.technologies,
      industries: structured.industries,
      preferredLocations: structured.preferredLocations,
      salaryCurrency: 'ILS',
      languages: structured.languages as Prisma.InputJsonValue,
      education: structured.education as Prisma.InputJsonValue,
      experience: structured.experience as Prisma.InputJsonValue,
      certifications: structured.certifications as Prisma.InputJsonValue,
      projects: structured.projects as Prisma.InputJsonValue,
      data: structured as unknown as Prisma.InputJsonValue,
      sourceResumeId,
    };
  }
}
