import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SavedSearch } from '@prisma/client';
import { JobFiltersDto } from '../jobs/dto/job-filters.dto';
import { JobsService, type PaginatedJobs } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedSearchDto, SavedSearchFiltersDto } from './dto/create-saved-search.dto';

/**
 * Per-user named job-search filters. Re-runnable against the shared, Israel-only
 * job pool via {@link JobsService}. Ownership is enforced on every operation so
 * one user can never read or delete another's saved searches.
 */
@Injectable()
export class SavedSearchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async create(userId: string, dto: CreateSavedSearchDto): Promise<SavedSearch> {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        filters: (dto.filters ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listForUser(userId: string): Promise<SavedSearch[]> {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw new NotFoundException('Saved search not found');
    }
  }

  /** Runs a saved search's filters against the job pool with pagination. */
  async run(userId: string, id: string, page = 1, pageSize = 20): Promise<PaginatedJobs> {
    const saved = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!saved) {
      throw new NotFoundException('Saved search not found');
    }
    const stored = (saved.filters ?? {}) as SavedSearchFiltersDto;
    const filters = Object.assign(new JobFiltersDto(), stored, { page, pageSize });
    return this.jobs.list(filters);
  }
}
