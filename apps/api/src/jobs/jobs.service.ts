import { Injectable, NotFoundException } from '@nestjs/common';
import { Job, JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobFiltersDto } from './dto/job-filters.dto';

export interface PaginatedJobs {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: JobFiltersDto): Promise<PaginatedJobs> {
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
}
