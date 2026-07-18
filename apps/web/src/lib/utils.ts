import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a number as ILS currency for the Israeli market. */
export function formatShekels(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format an ISO date using the Israeli locale. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(value));
}
