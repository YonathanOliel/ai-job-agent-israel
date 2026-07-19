import { UnprocessableEntityException } from '@nestjs/common';
import type { AiProvider } from '../ai/ai-provider.types';
import { LlmReferralExtractor } from './llm-referral.extractor';

describe('LlmReferralExtractor', () => {
  const buildExtractor = (response: string) => {
    const ai: AiProvider = { name: 'mock', complete: jest.fn().mockResolvedValue(response) };
    return { extractor: new LlmReferralExtractor(ai), ai };
  };

  it('parses and validates a JSON completion', async () => {
    const { extractor } = buildExtractor(
      JSON.stringify({
        jobTitle: 'Frontend Developer',
        company: null,
        technologies: ['react'],
        seniority: 'SENIOR',
        workArrangement: null,
        location: 'תל אביב',
        confidence: 0.72,
      }),
    );

    const result = await extractor.extract('raw post text');

    expect(result.jobTitle).toBe('Frontend Developer');
    expect(result.seniority).toBe('SENIOR');
    expect(result.confidence).toBe(0.72);
  });

  it('strips markdown code fences before parsing', async () => {
    const { extractor } = buildExtractor('```json\n{"jobTitle":"Dev","confidence":0.5}\n```');
    const result = await extractor.extract('raw post');
    expect(result.jobTitle).toBe('Dev');
  });

  it('rejects non-JSON output', async () => {
    const { extractor } = buildExtractor('not json at all');
    await expect(extractor.extract('raw post')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects output that violates the schema', async () => {
    const { extractor } = buildExtractor(JSON.stringify({ seniority: 'BOSS' }));
    await expect(extractor.extract('raw post')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
