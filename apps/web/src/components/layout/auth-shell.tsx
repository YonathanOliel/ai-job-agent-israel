import { BadgeCheck, Sparkles, Target } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

const POINTS = [
  {
    icon: Target,
    title: 'התאמה אמיתית',
    text: 'דירוג משרות לפי סיכוי אמיתי להתקבל — לא רק מילות מפתח.',
  },
  {
    icon: Sparkles,
    title: 'הסבר לכל התאמה',
    text: 'רואים בדיוק למה משרה מתאימה לך ומה חסר כדי לסגור את הפער.',
  },
  {
    icon: BadgeCheck,
    title: 'רק משרות מהארץ',
    text: 'משרות היי־טק בישראל בלבד, ממקורות רשמיים ומאומתים.',
  },
];

/** Split-screen auth frame: brand story on one side, form on the other. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-deep p-12 text-[hsl(40_20%_92%)] lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_65%_at_100%_0%,hsl(36_44%_58%/0.16),transparent)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-[hsl(30_28%_10%)]">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight">סוכן העבודה החכם</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            העבודה הבאה שלך בהיי־טק,
            <br />
            מותאמת אליך אישית.
          </h2>
          <p className="mt-3 text-[hsl(40_12%_72%)]">
            מעלים קורות חיים פעם אחת, והסוכן מוצא, מדרג ומסביר את המשרות שהכי שווה לך להגיש להן.
          </p>
          <ul className="mt-8 flex flex-col gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <p.icon className="size-[18px]" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-[hsl(40_10%_66%)]">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-[hsl(40_10%_62%)]">חינם לגמרי · ללא כרטיס אשראי</p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-brand-soft px-5 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
