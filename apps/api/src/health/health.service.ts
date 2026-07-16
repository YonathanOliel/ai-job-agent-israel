import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const databaseUp = await this.prisma.isHealthy();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseUp ? 'up' : 'down',
      },
    };
  }
}
