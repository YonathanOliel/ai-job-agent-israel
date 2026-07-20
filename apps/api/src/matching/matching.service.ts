import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Job, JobMatch, JobStatus, MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { israelJobWhere } from '../jobs/israel-filter';
import { MatchFiltersDto } from './dto/match-filters.dto';
import { MATCH_SCORER, type MatchScorer } from './match-score.types';

export type MatchWithJob = JobMatch & { job: Job };

export interface PaginatedMatches {
  items: MatchWithJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GenerateResult extends PaginatedMatches {
  generated: number;
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MATCH_SCORER) private readonly scorer: MatchScorer,
  ) {}

  async generate(userId: string): Promise<GenerateResult> {
    const profile = await this.prisma.careerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new UnprocessableEntityException('Generate your career profile before matching jobs');
    }

    const jobs = await this.prisma.job.findMany({
      // Israel-only mandate: never match a candidate against a non-Israeli job.
      where: { status: JobStatus.ACTIVE, ...israelJobWhere() },
    });
    for (const job of jobs) {
      const result = await this.scorer.score(profile, job);
      await this.prisma.jobMatch.upsert({
        where: { userId_jobId: { userId, jobId: job.id } },
        create: {
          userId,
          jobId: job.id,
          overallScore: result.overall,
          scores: result as unknown as Prisma.InputJsonValue,
        },
        // Preserve the user's status (SAVED/APPLIED/…) while refreshing scores.
        update: {
          overallScore: result.overall,
          scores: result as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Drop stale matches for jobs no longer in scope (e.g. now-archived or
    // non-Israeli postings from a previous run), keeping the list Israel-only.
    await this.prisma.jobMatch.deleteMany({
      where: { userId, jobId: { notIn: jobs.map((job) => job.id) } },
    });

    const list = await this.list(userId, Object.assign(new MatchFiltersDto(), {}));
    return { generated: jobs.length, ...list };
  }

  async list(userId: string, filters: MatchFiltersDto): Promise<PaginatedMatches> {
    const where: Prisma.JobMatchWhereInput = { userId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.minScore !== undefined) {
      where.overallScore = { gte: filters.minScore };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.jobMatch.findMany({
        where,
        include: { job: true },
        orderBy: { overallScore: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.jobMatch.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  async get(userId: string, jobId: string): Promise<MatchWithJob> {
    const match = await this.prisma.jobMatch.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: { job: true },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  async updateStatus(userId: string, jobId: string, status: MatchStatus): Promise<MatchWithJob> {
    try {
      return await this.prisma.jobMatch.update({
        where: { userId_jobId: { userId, jobId } },
        data: { status },
        include: { job: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Match not found');
      }
      throw error;
    }
  }
}
