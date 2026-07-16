import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const buildService = async (databaseUp: boolean): Promise<HealthService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { isHealthy: jest.fn().mockResolvedValue(databaseUp) },
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
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('reports "degraded" when the database is unreachable', async () => {
    const service = await buildService(false);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
  });
});
