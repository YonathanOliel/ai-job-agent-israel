import { CompanyRegistryService } from './company-registry.service';
import { AtsDetectionService } from './ats-detection.service';

describe('AtsDetectionService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('detects Greenhouse and registers an Israel-eligible board', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('boards-api.greenhouse.io')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            jobs: [
              { title: 'Backend Engineer', location: { name: 'Tel Aviv, Israel' } },
              { title: 'Sales', location: { name: 'New York' } },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const registry = { upsertDiscovered: jest.fn().mockResolvedValue(undefined) };
    const service = new AtsDetectionService(registry as unknown as CompanyRegistryService);

    const [result] = await service.discover(['acme']);

    expect(result.ats).toBe('greenhouse');
    expect(result.jobs).toBe(2);
    expect(result.israelJobs).toBe(1);
    expect(result.registered).toBe(true);
    expect(registry.upsertDiscovered).toHaveBeenCalledWith('Acme', 'greenhouse', 'acme', 1);
  });

  it('returns no match and does not register unknown tokens', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    const registry = { upsertDiscovered: jest.fn() };
    const service = new AtsDetectionService(registry as unknown as CompanyRegistryService);

    const [result] = await service.discover(['nope']);

    expect(result.ats).toBeNull();
    expect(result.registered).toBe(false);
    expect(registry.upsertDiscovered).not.toHaveBeenCalled();
  });

  it('does not register a board with jobs but no Israeli roles', async () => {
    global.fetch = jest.fn((url: string) =>
      url.includes('api.lever.co')
        ? Promise.resolve({
            ok: true,
            json: async () => [{ text: 'Engineer', categories: { location: 'Berlin' } }],
          })
        : Promise.resolve({ ok: false, status: 404 }),
    ) as unknown as typeof fetch;
    const registry = { upsertDiscovered: jest.fn() };
    const service = new AtsDetectionService(registry as unknown as CompanyRegistryService);

    const [result] = await service.discover(['globalco']);

    expect(result.ats).toBe('lever');
    expect(result.israelJobs).toBe(0);
    expect(result.registered).toBe(false);
    expect(registry.upsertDiscovered).not.toHaveBeenCalled();
  });
});
