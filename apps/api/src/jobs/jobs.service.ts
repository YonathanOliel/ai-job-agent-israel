import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Job, JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService } from '../search/job-search.service';
import { JobFiltersDto } from './dto/job-filters.dto';

export interface PaginatedJobs {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}

/** High-signal Israeli location terms (English + Hebrew) for the Israel-only filter. */
const ISRAEL_LOCATION_TERMS = [
  'israel',
  'ישראל',
  'tel aviv',
  'תל אביב',
  'תל-אביב',
  'herzliya',
  'הרצליה',
  'haifa',
  'חיפה',
  'jerusalem',
  'ירושלים',
  'netanya',
  'נתניה',
  "ra'anana",
  'raanana',
  'רעננה',
  'petah',
  'פתח תקווה',
  'beer sheva',
  'באר שבע',
  'yokneam',
  'יקנעם',
  'rehovot',
  'רחובות',
  'ramat gan',
  'רמת גן',
  'givatayim',
  'גבעתיים',
  'kfar saba',
  'כפר סבא',
  'hod hasharon',
  'modiin',
  'מודיעין',
  'or yehuda',
  'caesarea',
  'קיסריה',
  'airport city',
];

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: JobSearchService,
  ) {}

  async list(filters: JobFiltersDto): Promise<PaginatedJobs> {
    // Use Elasticsearch for free-text search (relevance + fuzzy) when available;
    // fall back to PostgreSQL for browse and whenever Elasticsearch is down.
    if (this.search.enabled && filters.search?.trim()) {
      try {
        return await this.searchViaElastic(filters);
      } catch (error) {
        this.logger.warn(
          `Elasticsearch search failed, falling back to SQL: ${(error as Error).message}`,
        );
      }
    }
    return this.listViaSql(filters);
  }

  /** Reindexes every active job into the search backend. Returns the count. */
  async reindex(): Promise<{ indexed: number }> {
    const jobs = await this.prisma.job.findMany({ where: { status: JobStatus.ACTIVE } });
    const indexed = await this.search.bulkIndex(jobs);
    return { indexed };
  }

  private async searchViaElastic(filters: JobFiltersDto): Promise<PaginatedJobs> {
    const { ids, total } = await this.search.search(filters);
    if (ids.length === 0) {
      return { items: [], total, page: filters.page, pageSize: filters.pageSize };
    }
    const jobs = await this.prisma.job.findMany({
      where: { id: { in: ids }, status: JobStatus.ACTIVE, ...this.israelWhere() },
    });
    // Preserve Elasticsearch relevance order.
    const byId = new Map(jobs.map((job) => [job.id, job]));
    const items = ids.map((id) => byId.get(id)).filter((job): job is Job => job !== undefined);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  private async listViaSql(filters: JobFiltersDto): Promise<PaginatedJobs> {
    const where = this.buildWhere(filters);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  async getById(id: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private buildWhere(filters: JobFiltersDto): Prisma.JobWhereInput {
    const where: Prisma.JobWhereInput = { status: JobStatus.ACTIVE };
    // Israel-only mandate: every listing must be located in Israel.
    where.AND = [this.israelWhere()];

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.isRemote !== undefined) {
      where.isRemote = filters.isRemote;
    }
    if (filters.seniority) {
      where.seniority = filters.seniority;
    }
    if (filters.workArrangement) {
      where.workArrangement = filters.workArrangement;
    }
    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }
    if (filters.technology) {
      where.technologies = { has: filters.technology.toLowerCase() };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  /**
   * Restricts results to jobs located in Israel. Matches Israeli city/country
   * signals (English + Hebrew) against the free-text location and city fields,
   * enforcing the Israel-only mandate across every listing surface.
   */
  private israelWhere(): Prisma.JobWhereInput {
    const clauses: Prisma.JobWhereInput[] = [];
    for (const term of ISRAEL_LOCATION_TERMS) {
      clauses.push({ location: { contains: term, mode: 'insensitive' } });
      clauses.push({ city: { contains: term, mode: 'insensitive' } });
    }
    return { OR: clauses };
  }
}
