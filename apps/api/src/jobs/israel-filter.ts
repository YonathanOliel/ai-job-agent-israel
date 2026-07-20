import { Prisma } from '@prisma/client';

/** High-signal Israeli location terms (English + Hebrew) for the Israel-only filter. */
export const ISRAEL_LOCATION_TERMS = [
  'israel',
  'ישראל',
  'tel aviv',
  'תל אביב',
  'תל-אביב',
  'herzliya',
  'הרצליה',
  'haifa',
  'חיפה',
  'jerusalem',
  'ירושלים',
  'netanya',
  'נתניה',
  "ra'anana",
  'raanana',
  'רעננה',
  'petah',
  'פתח תקווה',
  'beer sheva',
  'באר שבע',
  'yokneam',
  'יקנעם',
  'rehovot',
  'רחובות',
  'ramat gan',
  'רמת גן',
  'givatayim',
  'גבעתיים',
  'kfar saba',
  'כפר סבא',
  'hod hasharon',
  'modiin',
  'מודיעין',
  'or yehuda',
  'caesarea',
  'קיסריה',
  'airport city',
];

/**
 * Prisma `where` clause restricting jobs to those located in Israel. Matches
 * Israeli city/country signals (English + Hebrew) against the free-text
 * `location` and `city` fields. Shared by the job listing and match generation
 * so the Israel-only mandate is enforced consistently everywhere.
 */
export function israelJobWhere(): Prisma.JobWhereInput {
  const clauses: Prisma.JobWhereInput[] = [];
  for (const term of ISRAEL_LOCATION_TERMS) {
    clauses.push({ location: { contains: term, mode: 'insensitive' } });
    clauses.push({ city: { contains: term, mode: 'insensitive' } });
  }
  return { OR: clauses };
}
