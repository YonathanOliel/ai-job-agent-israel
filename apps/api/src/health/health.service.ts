import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService } from '../search/job-search.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    search: 'up' | 'down' | 'disabled';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: JobSearchService,
  ) {}

  async check(): Promise<HealthStatus> {
    const databaseUp = await this.prisma.isHealthy();
    const search = !this.search.enabled ? 'disabled' : (await this.search.ping()) ? 'up' : 'down';

    return {
      status: databaseUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseUp ? 'up' : 'down',
        search,
      },
    };
  }
}
