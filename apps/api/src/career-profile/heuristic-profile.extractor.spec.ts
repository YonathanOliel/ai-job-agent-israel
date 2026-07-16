import { LanguageCode, SeniorityLevel } from '@prisma/client';
import { HeuristicProfileExtractor } from './heuristic-profile.extractor';

describe('HeuristicProfileExtractor', () => {
  const extractor = new HeuristicProfileExtractor();

  it('extracts technologies, skills, seniority, years, and languages', async () => {
    const text = [
      'Senior Backend Engineer',
      'Experienced developer with 8 years building systems.',
      'Technologies: TypeScript, Node.js, PostgreSQL, Docker, AWS.',
      'Strong team leadership and project management.',
      'Languages: Hebrew, English.',
    ].join('\n');

    const result = await extractor.extract(text, LanguageCode.EN);

    expect(result.technologies).toEqual(
      expect.arrayContaining(['typescript', 'node.js', 'postgresql', 'docker', 'aws']),
    );
    expect(result.skills).toEqual(
      expect.arrayContaining(['Team leadership', 'Project management']),
    );
    expect(result.seniority).toBe(SeniorityLevel.SENIOR);
    expect(result.yearsExperience).toBe(8);
    expect(result.languages.map((l) => l.name)).toEqual(
      expect.arrayContaining(['Hebrew', 'English']),
    );
    expect(result.headline).toBe('Senior Backend Engineer');
  });

  it('infers seniority from years when no title keyword is present', async () => {
    const result = await extractor.extract('Developer with 5 years of experience', LanguageCode.EN);
    expect(result.seniority).toBe(SeniorityLevel.MID);
  });

  it('handles Hebrew resumes', async () => {
    const text = 'מפתחת תוכנה\nניסיון של 3 שנים בעבודה עם Python ו-React';
    const result = await extractor.extract(text, LanguageCode.HE);
    expect(result.technologies).toEqual(expect.arrayContaining(['python', 'react']));
    expect(result.yearsExperience).toBe(3);
  });
});
