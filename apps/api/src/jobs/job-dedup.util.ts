import { createHash } from 'node:crypto';

/**
 * Normalizes free text for stable comparison: lowercased, Hebrew niqqud removed,
 * punctuation collapsed to single spaces. Language-preserving (Hebrew/Latin).
 */
function normalize(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\u0591-\u05c7]/g, '') // Hebrew niqqud / cantillation marks
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Primary city token (drops country/region suffixes): "Tel Aviv, Israel" -> "tel aviv". */
function primaryCity(city: string | undefined): string {
  return normalize((city ?? '').split(',')[0]);
}

/**
 * Stable key grouping the same posting seen across multiple sources, based on
 * company + title + primary city. Used to detect cross-source duplicates.
 */
export function buildDedupeKey(company: string, title: string, city?: string): string {
  const key = [normalize(company), normalize(title), primaryCity(city)].filter(Boolean).join('|');
  return createHash('sha1').update(key).digest('hex').slice(0, 24);
}

/**
 * Hash of a posting's meaningful content. Lets ingestion detect when a posting's
 * content changed (title/company/description) even if its external id is stable.
 */
export function buildContentHash(title: string, company: string, description: string): string {
  const content = [normalize(title), normalize(company), normalize(description)].join('|');
  return createHash('sha1').update(content).digest('hex');
}
