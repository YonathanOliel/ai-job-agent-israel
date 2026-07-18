import { SeniorityLevel } from '@prisma/client';

/** Technologies used to enrich matching and detect tech roles. */
export const TECH_TERMS = [
  'typescript',
  'javascript',
  'node.js',
  'nodejs',
  'react',
  'next.js',
  'angular',
  'vue',
  'svelte',
  'python',
  'django',
  'flask',
  'fastapi',
  'java',
  'spring',
  'kotlin',
  'scala',
  'c#',
  '.net',
  'c++',
  'go',
  'golang',
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
  'elasticsearch',
  'graphql',
  'docker',
  'kubernetes',
  'terraform',
  'aws',
  'gcp',
  'azure',
  'kafka',
  'spark',
  'pandas',
  'pytorch',
  'tensorflow',
  'linux',
  'git',
  'html',
  'css',
  'tailwind',
];

const ROLE_SIGNALS =
  /\b(developer|engineer|engineering|software|backend|front-?end|full[-\s]?stack|devops|sre|data (?:scientist|engineer|analyst)|machine learning|qa|automation|mobile developer|ios|android|cloud|cyber|architect|programmer|sysadmin)\b/i;

/** Whether a role (title + tags text) is a technology role. */
export function isTechRole(text: string): boolean {
  const lower = text.toLowerCase();
  return ROLE_SIGNALS.test(lower) || TECH_TERMS.some((term) => mentions(lower, term));
}

/** Extract known technologies mentioned in the given text. */
export function extractTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  return TECH_TERMS.filter((term) => mentions(lower, term));
}

/**
 * Whole-word match for a term. Alphanumeric terms use word boundaries (so "go"
 * does not match "Goldhausen"); terms with symbols (node.js, c#, .net) fall back
 * to a substring check.
 */
function mentions(haystackLower: string, term: string): boolean {
  if (/^[a-z0-9]+$/.test(term)) {
    return new RegExp(`\\b${term}\\b`).test(haystackLower);
  }
  return haystackLower.includes(term);
}

/** Infer a seniority level from a job title (best-effort). */
export function inferSeniority(title: string): SeniorityLevel | undefined {
  const t = title.toLowerCase();
  if (/\b(principal|staff|lead)\b|ראש צוות/.test(t)) return SeniorityLevel.LEAD;
  if (/\b(senior|sr\.?)\b|בכיר/.test(t)) return SeniorityLevel.SENIOR;
  if (/\b(junior|jr\.?|entry|intern)\b|זוטר|מתמחה/.test(t)) return SeniorityLevel.JUNIOR;
  if (/\bdirector\b/.test(t)) return SeniorityLevel.DIRECTOR;
  if (/\bmanager\b|מנהל/.test(t)) return SeniorityLevel.MANAGER;
  return undefined;
}

/** Strip HTML tags and decode common entities. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
