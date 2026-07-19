import { PrismaService } from '../prisma/prisma.service';
import { CompanyRegistryService } from './company-registry.service';

describe('CompanyRegistryService', () => {
  it('lists enabled companies for an ATS type', async () => {
    const prisma = {
      company: { findMany: jest.fn().mockResolvedValue([{ atsToken: 'wix', name: 'Wix' }]) },
    };
    const service = new CompanyRegistryService(prisma as unknown as PrismaService);

    await service.listFor('greenhouse');

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { atsType: 'greenhouse', enabled: true },
    });
  });

  it('upserts a discovered company idempotently by ats type + token', async () => {
    const prisma = { company: { upsert: jest.fn().mockResolvedValue({}) } };
    const service = new CompanyRegistryService(prisma as unknown as PrismaService);

    await service.upsertDiscovered('Wix', 'greenhouse', 'wix', 12);

    const args = prisma.company.upsert.mock.calls[0]![0];
    expect(args.where).toEqual({ atsType_atsToken: { atsType: 'greenhouse', atsToken: 'wix' } });
    expect(args.create).toMatchObject({ name: 'Wix', origin: 'discovered', lastJobCount: 12 });
    expect(args.update).toEqual({ lastJobCount: 12 });
  });
});
