import { UnprocessableEntityException } from '@nestjs/common';
import { LanguageCode, SeniorityLevel } from '@prisma/client';
import type { AiProvider } from '../ai/ai-provider.types';
import { LlmProfileExtractor } from './llm-profile.extractor';

describe('LlmProfileExtractor', () => {
  const buildExtractor = (response: string) => {
    const ai: AiProvider = { name: 'mock', complete: jest.fn().mockResolvedValue(response) };
    return { extractor: new LlmProfileExtractor(ai), ai };
  };

  it('parses and validates a JSON completion', async () => {
    const { extractor } = buildExtractor(
      JSON.stringify({
        headline: 'Senior Engineer',
        seniority: 'SENIOR',
        skills: ['Leadership'],
        technologies: ['TypeScript'],
      }),
    );

    const result = await extractor.extract('resume text', LanguageCode.EN);

    expect(result.seniority).toBe(SeniorityLevel.SENIOR);
    expect(result.technologies).toEqual(['TypeScript']);
    expect(result.industries).toEqual([]); // schema default applied
  });

  it('strips markdown code fences before parsing', async () => {
    const { extractor } = buildExtractor('```json\n{"headline":"Dev"}\n```');
    const result = await extractor.extract('resume text', LanguageCode.EN);
    expect(result.headline).toBe('Dev');
  });

  it('rejects non-JSON output', async () => {
    const { extractor } = buildExtractor('I could not extract anything.');
    await expect(extractor.extract('resume', LanguageCode.EN)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects output that violates the schema', async () => {
    const { extractor } = buildExtractor(JSON.stringify({ seniority: 'BOSS' }));
    await expect(extractor.extract('resume', LanguageCode.EN)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
