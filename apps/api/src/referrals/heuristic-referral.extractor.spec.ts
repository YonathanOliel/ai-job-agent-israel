import { SeniorityLevel, WorkArrangement } from '@prisma/client';
import { HeuristicReferralExtractor } from './heuristic-referral.extractor';

describe('HeuristicReferralExtractor', () => {
  const extractor = new HeuristicReferralExtractor();

  it('extracts technologies, seniority, and work arrangement from a clear posting', async () => {
    const text =
      'Senior Backend Developer\nLooking for a senior developer with React and Node.js experience. Hybrid, Tel Aviv.';

    const result = await extractor.extract(text);

    expect(result.seniority).toBe(SeniorityLevel.SENIOR);
    expect(result.workArrangement).toBe(WorkArrangement.HYBRID);
    expect(result.technologies).toEqual(expect.arrayContaining(['react', 'node.js']));
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('does not infer seniority from hype slang alone', async () => {
    const text = 'מחפשים תותח לקבוצה שלנו במרכז, חייב להכיר React.';

    const result = await extractor.extract(text);

    expect(result.seniority).toBeNull();
  });

  it('detects remote work arrangement in Hebrew', async () => {
    const result = await extractor.extract('משרה מהבית, דורש ניסיון ב-Python.');
    expect(result.workArrangement).toBe(WorkArrangement.REMOTE);
  });

  it('gives low confidence to text with no tech-role or technology signal', async () => {
    const result = await extractor.extract('מישהו מכיר מקום טוב לאכול בתל אביב?');
    expect(result.confidence).toBeLessThan(0.35);
  });

  it('never fabricates a company', async () => {
    const result = await extractor.extract('Senior React developer needed at a startup.');
    expect(result.company).toBeNull();
  });
});
