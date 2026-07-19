import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Job,
  JobReferral,
  JobStatus,
  Prisma,
  ReferralStatus,
  WorkArrangement,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { JobDedupService } from '../jobs/job-dedup.service';
import { buildContentHash, buildDedupeKey } from '../jobs/job-dedup.util';
import { computeQualityScore } from '../jobs/job-quality.util';
import { isIsraelLocation, isTechRole } from '../jobs/job-source.util';
import { JobSearchService } from '../search/job-search.service';
import type { SubmitReferralDto } from './dto/submit-referral.dto';
import type { ExtractedReferral } from './extracted-referral.schema';
import { REFERRAL_EXTRACTOR, type ReferralExtractor } from './referral-extractor.types';

const REFERRAL_SOURCE = 'referral';
const MIN_CONFIDENCE = 0.35;

/**
 * Compliant alternative to scraping LinkedIn/Facebook groups: a user pastes a
 * posting they already saw, we normalize it (heuristic or LLM), validate it's
 * a genuine Israeli tech role, and ingest it as a low-trust "referral" job
 * that the existing dedup engine merges with any official-source duplicate.
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: JobSearchService,
    private readonly embeddings: EmbeddingService,
    private readonly dedup: JobDedupService,
    @Inject(REFERRAL_EXTRACTOR) private readonly extractor: ReferralExtractor,
  ) {}

  async submit(userId: string, dto: SubmitReferralDto): Promise<JobReferral> {
    const referral = await this.prisma.jobReferral.create({
      data: { userId, rawUrl: dto.url ?? null, rawText: dto.text, status: ReferralStatus.PENDING },
    });

    try {
      const extracted = await this.extractor.extract(dto.text);
      const rejection = this.validate(extracted, dto.text);
      if (rejection) {
        return await this.prisma.jobReferral.update({
          where: { id: referral.id },
          data: { status: ReferralStatus.REJECTED, rejectionReason: rejection },
        });
      }

      const job = await this.ingest(extracted, dto);
      return await this.prisma.jobReferral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.ACCEPTED, resultingJobId: job.id },
      });
    } catch (error) {
      this.logger.warn(`Referral ${referral.id} normalization failed: ${(error as Error).message}`);
      return this.prisma.jobReferral.update({
        where: { id: referral.id },
        data: {
          status: ReferralStatus.REJECTED,
          rejectionReason: 'We could not process this posting. Please try again.',
        },
      });
    }
  }

  async listMine(userId: string): Promise<JobReferral[]> {
    return this.prisma.jobReferral.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Rejects low-confidence extractions and anything outside our Israel-tech mandate. */
  private validate(extracted: ExtractedReferral, rawText: string): string | null {
    if (extracted.confidence < MIN_CONFIDENCE) {
      return 'This does not look like a genuine job posting.';
    }
    if (!isTechRole(rawText)) {
      return 'Only Israeli tech roles are accepted.';
    }
    if (!isIsraelLocation(rawText)) {
      return 'Only Israel-based roles are accepted.';
    }
    return null;
  }

  private async ingest(extracted: ExtractedReferral, dto: SubmitReferralDto): Promise<Job> {
    const title = extracted.jobTitle ?? 'Untitled role';
    const company = extracted.company ?? 'Unknown company';
    const description = dto.text;
    // The exact submitted text is the stable identity for this referral — two
    // users pasting the same posting collapse into the same job row.
    const externalId = buildContentHash(title, company, description);

    const data: Prisma.JobUncheckedCreateInput = {
      source: REFERRAL_SOURCE,
      externalId,
      sourceUrl: dto.url,
      title,
      company,
      description,
      location: extracted.location,
      city: extracted.location,
      isRemote: extracted.workArrangement === WorkArrangement.REMOTE,
      workArrangement: extracted.workArrangement,
      seniority: extracted.seniority,
      technologies: extracted.technologies,
      skills: [],
      salaryCurrency: 'ILS',
      dedupeKey: buildDedupeKey(company, title, extracted.location ?? undefined),
      contentHash: externalId,
      qualityScore: computeQualityScore({
        source: REFERRAL_SOURCE,
        description,
        sourceUrl: dto.url,
        city: extracted.location ?? undefined,
        technologies: extracted.technologies,
        seniority: extracted.seniority,
      }),
      status: JobStatus.ACTIVE,
    };

    const now = new Date();
    const job = await this.prisma.job.upsert({
      where: { source_externalId: { source: REFERRAL_SOURCE, externalId } },
      create: { ...data, firstSeenAt: now, lastSeenAt: now },
      update: { ...data, lastSeenAt: now },
    });

    await this.search.index(job);
    await this.embeddings.embedJob(job);
    try {
      // Merges this referral with a canonical duplicate from a trusted source
      // (e.g. the same role already on the company's official ATS board).
      await this.dedup.reconcile();
    } catch (error) {
      this.logger.warn(`Dedup reconciliation after referral failed: ${(error as Error).message}`);
    }
    return job;
  }
}
