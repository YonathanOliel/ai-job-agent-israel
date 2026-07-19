import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { JobSearchService } from '../search/job-search.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const buildService = async (
    databaseUp: boolean,
    search: { enabled: boolean; connected?: boolean } = { enabled: false },
    embeddingsEnabled = false,
  ): Promise<HealthService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { isHealthy: jest.fn().mockResolvedValue(databaseUp) },
        },
        {
          provide: JobSearchService,
          useValue: {
            enabled: search.enabled,
            ping: jest.fn().mockResolvedValue(search.connected ?? false),
          },
        },
        {
          provide: EmbeddingService,
          useValue: { enabled: embeddingsEnabled },
        },
      ],
    }).compile();

    return moduleRef.get(HealthService);
  };

  it('reports "ok" when the database is reachable', async () => {
    const service = await buildService(true);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('up');
    expect(result.services.search).toBe('disabled');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('reports "degraded" when the database is unreachable', async () => {
    const service = await buildService(false);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
  });

  it('reports search "up" when Elasticsearch is enabled and reachable', async () => {
    const service = await buildService(true, { enabled: true, connected: true });

    const result = await service.check();

    expect(result.services.search).toBe('up');
  });

  it('reports search "down" when Elasticsearch is enabled but unreachable', async () => {
    const service = await buildService(true, { enabled: true, connected: false });

    const result = await service.check();

    expect(result.services.search).toBe('down');
  });

  it('reports matching "deterministic" when no embedding provider is configured', async () => {
    const service = await buildService(true, { enabled: false }, false);

    const result = await service.check();

    expect(result.services.matching).toBe('deterministic');
  });

  it('reports matching "semantic" when an embedding provider is configured', async () => {
    const service = await buildService(true, { enabled: false }, true);

    const result = await service.check();

    expect(result.services.matching).toBe('semantic');
  });
});
