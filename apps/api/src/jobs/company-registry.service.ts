import { Injectable } from '@nestjs/common';
import { Company } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * DB-backed registry of ATS companies discovered by the Discovery engine. The
 * ATS connectors merge these with their env-configured companies, so newly
 * discovered boards start being ingested without any code/config change.
 */
@Injectable()
export class CompanyRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Enabled companies for a given ATS type (e.g. "greenhouse"). */
  listFor(atsType: string): Promise<Company[]> {
    return this.prisma.company.findMany({ where: { atsType, enabled: true } });
  }

  /** Records a discovered company (idempotent by ATS type + token). */
  async upsertDiscovered(
    name: string,
    atsType: string,
    atsToken: string,
    lastJobCount: number,
  ): Promise<void> {
    await this.prisma.company.upsert({
      where: { atsType_atsToken: { atsType, atsToken } },
      create: { name, atsType, atsToken, origin: 'discovered', lastJobCount },
      update: { lastJobCount },
    });
  }
}
