import { computeQualityScore } from './job-quality.util';

describe('computeQualityScore', () => {
  const now = new Date('2026-07-19T00:00:00Z');

  it('scores a rich, fresh, trusted posting highly', () => {
    const score = computeQualityScore(
      {
        source: 'greenhouse',
        description: 'x'.repeat(500),
        sourceUrl: 'https://careers.example.com/1',
        city: 'Tel Aviv',
        salaryMin: 30000,
        technologies: ['python', 'aws'],
        seniority: 'SENIOR',
        employmentType: 'FULL_TIME',
        postedAt: new Date('2026-07-18T00:00:00Z'),
      },
      now,
    );
    // 40 trust + 40 completeness + 20 freshness
    expect(score).toBe(100);
  });

  it('scores a sparse, old, low-trust posting lowly', () => {
    const score = computeQualityScore(
      {
        source: 'telegram',
        description: 'short',
        postedAt: new Date('2026-01-01T00:00:00Z'),
      },
      now,
    );
    // trust 12 + completeness 0 + freshness 3
    expect(score).toBe(15);
  });

  it('gives a neutral freshness when postedAt is missing', () => {
    const withRecentDate = computeQualityScore(
      { source: 'remotive', postedAt: new Date('2026-07-15T00:00:00Z') },
      now,
    );
    const withoutDate = computeQualityScore({ source: 'remotive' }, now);
    expect(withoutDate).toBeGreaterThan(0);
    expect(withRecentDate).toBeGreaterThan(withoutDate);
  });
});
