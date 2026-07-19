'use client';

import { AppShell } from '@/components/layout/app-shell';
import { JobSearch } from '@/components/jobs/job-search';
import { useAuth } from '@/lib/auth-context';

export default function JobsPage() {
  const { token } = useAuth();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">חיפוש משרות</h1>
        <p className="mt-1 text-muted-foreground">
          משרות היי־טק בישראל בלבד, ממקורות רשמיים ומאומתים.
        </p>
      </div>
      {token && <JobSearch token={token} />}
    </AppShell>
  );
}
