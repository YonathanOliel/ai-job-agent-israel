'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutGrid, LogOut, Search, FileText, Share2, type LucideIcon } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'התאמות', icon: LayoutGrid },
  { href: '/jobs', label: 'חיפוש משרות', icon: Search },
  { href: '/resume', label: 'קורות חיים', icon: FileText },
  { href: '/share', label: 'שיתוף משרה', icon: Share2 },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Authenticated app frame: sticky header, mobile bottom nav, guarded content. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const label = user.displayName ?? user.email;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 glass">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  <item.icon className="size-[18px]" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <div
              className="hidden size-9 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-[hsl(30_28%_10%)] sm:grid"
              title={label}
              aria-hidden
            >
              {initials(label)}
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="size-[18px]" aria-hidden />
              <span className="hidden sm:inline">התנתקות</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container pb-24 pt-6 md:pb-12 md:pt-8">{children}</main>

      {/* Mobile bottom navigation — thumb-zone friendly */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 glass md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon
                  className={cn('size-5', active && 'scale-110 transition-transform')}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
