import { Injectable } from '@nestjs/common';
import { LanguageCode, SeniorityLevel } from '@prisma/client';
import type { ProfileExtractor } from './profile-extractor.types';
import type { StructuredProfile } from './structured-profile.schema';

const TECHNOLOGY_TERMS = [
  'typescript',
  'javascript',
  'node.js',
  'nestjs',
  'react',
  'next.js',
  'angular',
  'vue',
  'python',
  'django',
  'flask',
  'java',
  'spring',
  'kotlin',
  'c#',
  '.net',
  'c++',
  'go',
  'rust',
  'php',
  'laravel',
  'ruby',
  'rails',
  'sql',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'graphql',
  'docker',
  'kubernetes',
  'aws',
  'gcp',
  'azure',
  'terraform',
  'kafka',
  'rabbitmq',
  'git',
  'linux',
  'html',
  'css',
  'tailwind',
  'pandas',
  'pytorch',
  'tensorflow',
];

const SKILL_TERMS: Array<{ canonical: string; terms: string[] }> = [
  { canonical: 'Team leadership', terms: ['team leadership', 'team lead', 'ניהול צוות'] },
  { canonical: 'Project management', terms: ['project management', 'ניהול פרויקטים'] },
  { canonical: 'Agile', terms: ['agile', 'scrum', 'אג׳ייל'] },
  { canonical: 'System design', terms: ['system design', 'architecture', 'ארכיטקטורה'] },
  { canonical: 'Communication', terms: ['communication', 'תקשורת בין-אישית', 'עבודת צוות'] },
  { canonical: 'Mentoring', terms: ['mentoring', 'mentorship', 'חניכה'] },
];

const LANGUAGE_TERMS: Array<{ name: string; terms: string[] }> = [
  { name: 'Hebrew', terms: ['hebrew', 'עברית'] },
  { name: 'English', terms: ['english', 'אנגלית'] },
  { name: 'Arabic', terms: ['arabic', 'ערבית'] },
  { name: 'Russian', terms: ['russian', 'רוסית'] },
  { name: 'French', terms: ['french', 'צרפתית'] },
  { name: 'Spanish', terms: ['spanish', 'ספרדית'] },
];

const SENIORITY_KEYWORDS: Array<{ level: SeniorityLevel; terms: string[] }> = [
  { level: SeniorityLevel.EXECUTIVE, terms: ['cto', 'ceo', 'chief'] },
  { level: SeniorityLevel.DIRECTOR, terms: ['director', 'דירקטור'] },
  { level: SeniorityLevel.MANAGER, terms: ['manager', 'מנהל'] },
  { level: SeniorityLevel.LEAD, terms: ['team lead', 'tech lead', 'ראש צוות'] },
  { level: SeniorityLevel.SENIOR, terms: ['senior', 'בכיר'] },
  { level: SeniorityLevel.JUNIOR, terms: ['junior', 'זוטר', 'entry level'] },
  { level: SeniorityLevel.STUDENT, terms: ['student', 'סטודנט', 'intern', 'מתמחה'] },
];

/**
 * Deterministic, offline resume extractor. Uses dictionaries and patterns to
 * pull skills, technologies, languages, seniority, and years of experience.
 * Serves as the default (no API key required); the LLM extractor handles the
 * richer free-text sections.
 */
@Injectable()
export class HeuristicProfileExtractor implements ProfileExtractor {
  readonly name = 'heuristic';

  async extract(text: string, _language: LanguageCode): Promise<StructuredProfile> {
    const lower = text.toLowerCase();
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const technologies = TECHNOLOGY_TERMS.filter((term) => this.mentions(lower, term));
    const skills = SKILL_TERMS.filter((s) => s.terms.some((t) => this.mentions(lower, t))).map(
      (s) => s.canonical,
    );
    const languages = LANGUAGE_TERMS.filter((l) =>
      l.terms.some((t) => this.mentions(lower, t)),
    ).map((l) => ({ name: l.name }));

    const yearsExperience = this.detectYears(lower);
    const seniority = this.detectSeniority(lower, yearsExperience);

    return {
      headline: lines[0]?.slice(0, 120),
      summary: this.detectSummary(lines),
      yearsExperience,
      seniority,
      desiredRoles: [],
      skills,
      technologies,
      industries: [],
      preferredLocations: [],
      languages,
      education: [],
      experience: [],
      certifications: [],
      projects: [],
    };
  }

  private detectSummary(lines: string[]): string | undefined {
    const body = lines.slice(1).join(' ');
    return body ? body.slice(0, 400) : undefined;
  }

  private detectYears(lower: string): number | undefined {
    const matches = [...lower.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs|year|שנ(?:ים|ות|ה))/g)];
    const values = matches.map((m) => Number(m[1])).filter((n) => n > 0 && n < 60);
    return values.length ? Math.max(...values) : undefined;
  }

  private detectSeniority(lower: string, years?: number): SeniorityLevel | undefined {
    for (const { level, terms } of SENIORITY_KEYWORDS) {
      if (terms.some((t) => this.mentions(lower, t))) {
        return level;
      }
    }
    if (years === undefined) return undefined;
    if (years >= 8) return SeniorityLevel.SENIOR;
    if (years >= 4) return SeniorityLevel.MID;
    if (years >= 1) return SeniorityLevel.JUNIOR;
    return SeniorityLevel.STUDENT;
  }

  private mentions(haystackLower: string, term: string): boolean {
    const t = term.toLowerCase();
    if (/^[a-z0-9 ]+$/.test(t)) {
      return new RegExp(`\\b${this.escape(t)}\\b`).test(haystackLower);
    }
    return haystackLower.includes(t);
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
