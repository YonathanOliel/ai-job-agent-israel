'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JobSearch } from '@/components/jobs/job-search';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export default function JobsPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">טוען…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold">סוכן העבודה החכם</h1>
            <p className="text-sm text-muted-foreground">חיפוש משרות</p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-secondary"
            >
              התאמות
            </Link>
            <Link
              href="/resume"
              className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-secondary"
            >
              קורות חיים
            </Link>
            <Button variant="ghost" onClick={logout}>
              התנתקות
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-8">
        <h2 className="mb-6 text-2xl font-bold">חיפוש משרות בישראל</h2>
        <JobSearch token={token} />
      </main>
    </div>
  );
}
