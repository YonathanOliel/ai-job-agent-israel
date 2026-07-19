import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from '../ai/ai-provider.types';
import { AiProviderError } from '../ai/ai-provider.types';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { MatchInsightService } from './match-insight.service';

const buildConfig = (values: Partial<Record<string, unknown>>): ConfigService<Env, true> =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService<Env, true>;

const match = {
  overallScore: 82,
  scores: {
    missingSkills: ['graphql'],
    dimensions: {
      technology: { score: 90, explanation: '' },
      experience: { score: 80, explanation: '' },
    },
  },
  job: {
    id: 'j1',
    title: 'Senior Backend Engineer',
    company: 'Wix',
    seniority: 'SENIOR',
    technologies: ['node.js', 'typescript'],
    city: 'Tel Aviv',
    location: null,
  },
};

const profile = {
  headline: 'Senior Backend Engineer',
  seniority: 'SENIOR',
  yearsExperience: 8,
  technologies: ['node.js', 'typescript'],
  skills: ['System design'],
};

describe('MatchInsightService', () => {
  let prisma: {
    jobMatch: { findUnique: jest.Mock };
    careerProfile: { findUnique: jest.Mock };
  };
  let ai: jest.Mocked<AiProvider>;

  beforeEach(() => {
    prisma = {
      jobMatch: { findUnique: jest.fn().mockResolvedValue(match) },
      careerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
    };
    ai = { name: 'openai', complete: jest.fn() };
  });

  const build = (values: Partial<Record<string, unknown>>) =>
    new MatchInsightService(prisma as unknown as PrismaService, buildConfig(values), ai);

  describe('enabled', () => {
    it('is false when the selected provider has no key', () => {
      const service = build({ AI_DEFAULT_PROVIDER: 'openai', OPENAI_API_KEY: undefined });
      expect(service.enabled).toBe(false);
    });

    it('is true when the selected provider has a key', () => {
      const service = build({ AI_DEFAULT_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });
      expect(service.enabled).toBe(true);
    });

    it('checks the anthropic key when anthropic is selected', () => {
      const service = build({ AI_DEFAULT_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'ak-test' });
      expect(service.enabled).toBe(true);
    });
  });

  describe('explain', () => {
    it('throws ServiceUnavailable when AI is not configured', async () => {
      const service = build({ AI_DEFAULT_PROVIDER: 'openai' });
      await expect(service.explain('u1', 'j1')).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(ai.complete).not.toHaveBeenCalled();
    });

    it('returns a parsed, provider-tagged insight on success', async () => {
      ai.complete.mockResolvedValue(
        JSON.stringify({ whyYouFit: 'התאמה מצוינת', whatYouMiss: 'שווה ללמוד GraphQL' }),
      );
      const service = build({ AI_DEFAULT_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });

      const insight = await service.explain('u1', 'j1');

      expect(insight).toEqual({
        whyYouFit: 'התאמה מצוינת',
        whatYouMiss: 'שווה ללמוד GraphQL',
        provider: 'openai',
      });
    });

    it('throws ServiceUnavailable when the AI provider fails', async () => {
      ai.complete.mockRejectedValue(new AiProviderError('boom', 'openai'));
      const service = build({ AI_DEFAULT_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });
      await expect(service.explain('u1', 'j1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws ServiceUnavailable when the AI output is invalid', async () => {
      ai.complete.mockResolvedValue('not json');
      const service = build({ AI_DEFAULT_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });
      await expect(service.explain('u1', 'j1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws when the match does not exist', async () => {
      prisma.jobMatch.findUnique.mockResolvedValue(null);
      const service = build({ AI_DEFAULT_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });
      await expect(service.explain('u1', 'j1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
