import { SeniorityLevel } from '@prisma/client';
import { buildJobEmbeddingText, buildProfileEmbeddingText } from './embedding-text.util';

describe('buildJobEmbeddingText', () => {
  it('composes high-signal fields in order and skips empty ones', () => {
    const text = buildJobEmbeddingText({
      title: 'Senior Backend Engineer',
      company: 'Wix',
      seniority: SeniorityLevel.SENIOR,
      technologies: ['node.js', 'postgresql'],
      skills: ['System design'],
      description: 'Build scalable services.',
    });

    expect(text).toBe(
      [
        'Senior Backend Engineer',
        'Wix',
        'Seniority: SENIOR',
        'Technologies: node.js, postgresql',
        'Skills: System design',
        'Build scalable services.',
      ].join('\n'),
    );
  });

  it('omits null/empty fields', () => {
    const text = buildJobEmbeddingText({
      title: 'Developer',
      company: 'Acme',
      seniority: null,
      technologies: [],
      skills: [],
      description: '',
    });

    expect(text).toBe('Developer\nAcme');
  });
});

describe('buildProfileEmbeddingText', () => {
  it('composes high-signal fields in order and skips empty ones', () => {
    const text = buildProfileEmbeddingText({
      headline: 'Senior Backend Engineer',
      summary: 'Experienced developer.',
      seniority: SeniorityLevel.SENIOR,
      desiredRoles: ['Backend Engineer'],
      technologies: ['typescript'],
      skills: ['Leadership'],
      yearsExperience: 9,
    });

    expect(text).toBe(
      [
        'Senior Backend Engineer',
        'Seniority: SENIOR',
        'Years of experience: 9',
        'Desired roles: Backend Engineer',
        'Technologies: typescript',
        'Skills: Leadership',
        'Experienced developer.',
      ].join('\n'),
    );
  });

  it('omits null/empty fields', () => {
    const text = buildProfileEmbeddingText({
      headline: null,
      summary: null,
      seniority: null,
      desiredRoles: [],
      technologies: [],
      skills: [],
      yearsExperience: null,
    });

    expect(text).toBe('');
  });
});
