import type { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import type { Job } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { JobSearchService } from './job-search.service';

describe('JobSearchService', () => {
  const config = {
    get: () => 'jobs',
  } as unknown as ConfigService<Env, true>;

  const buildClient = () => ({
    indices: {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({}),
    },
    index: jest.fn().mockResolvedValue({}),
    bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    search: jest.fn().mockResolvedValue({
      hits: { total: { value: 2 }, hits: [{ _id: 'a' }, { _id: 'b' }] },
    }),
  });

  it('is disabled and a no-op without a client', async () => {
    const service = new JobSearchService(null, config);
    expect(service.enabled).toBe(false);
    await expect(service.search({ page: 1, pageSize: 20, search: 'x' })).resolves.toEqual({
      ids: [],
      total: 0,
    });
    await expect(service.index({ id: 'j1' } as Job)).resolves.toBeUndefined();
  });

  it('returns relevance-ordered ids and total from Elasticsearch', async () => {
    const client = buildClient();
    const service = new JobSearchService(client as unknown as Client, config);

    const result = await service.search({
      page: 1,
      pageSize: 20,
      search: 'engineer',
      seniority: 'SENIOR',
      technology: 'TypeScript',
    });

    expect(result).toEqual({ ids: ['a', 'b'], total: 2 });
    const request = client.search.mock.calls[0]![0];
    expect(request.index).toBe('jobs');
    const filterTerms = JSON.stringify(request.query.bool.filter);
    expect(filterTerms).toContain('SENIOR');
    expect(filterTerms).toContain('typescript'); // lowercased
  });

  it('creates the index on first use and indexes a document', async () => {
    const client = buildClient();
    client.indices.exists.mockResolvedValue(false);
    const service = new JobSearchService(client as unknown as Client, config);

    await service.index({ id: 'j1', title: 'Backend', technologies: [] } as unknown as Job);

    expect(client.indices.create).toHaveBeenCalled();
    expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'jobs', id: 'j1' }));
  });
});
