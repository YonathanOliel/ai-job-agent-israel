import { pickCanonical, sourceTrust } from './job-source-trust.util';

describe('job-source-trust.util', () => {
  const job = (over: Partial<ReturnType<typeof base>> = {}) => ({ ...base(), ...over });
  function base() {
    return {
      id: 'x',
      source: 'telegram',
      description: 'desc',
      postedAt: new Date('2026-07-01'),
      lastSeenAt: new Date('2026-07-01'),
    };
  }

  it('ranks official ATS above community feeds', () => {
    expect(sourceTrust('greenhouse')).toBeGreaterThan(sourceTrust('telegram'));
    expect(sourceTrust('unknown-source')).toBe(20);
  });

  it('picks the most trusted source as canonical', () => {
    const chosen = pickCanonical([
      job({ id: 'tg', source: 'telegram' }),
      job({ id: 'gh', source: 'greenhouse' }),
      job({ id: 'rk', source: 'remoteok' }),
    ]);
    expect(chosen.id).toBe('gh');
  });

  it('breaks ties on the richer description', () => {
    const chosen = pickCanonical([
      job({ id: 'short', source: 'remotive', description: 'short' }),
      job({ id: 'long', source: 'remotive', description: 'a much longer description' }),
    ]);
    expect(chosen.id).toBe('long');
  });

  it('breaks remaining ties on the most recent posting', () => {
    const chosen = pickCanonical([
      job({ id: 'old', source: 'remotive', description: 'same', postedAt: new Date('2026-01-01') }),
      job({ id: 'new', source: 'remotive', description: 'same', postedAt: new Date('2026-07-01') }),
    ]);
    expect(chosen.id).toBe('new');
  });
});
