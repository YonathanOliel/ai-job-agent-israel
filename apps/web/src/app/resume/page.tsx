'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ResumeManager } from '@/components/resume/resume-manager';
import { useAuth } from '@/lib/auth-context';

export default function ResumePage() {
  const { token } = useAuth();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          קורות חיים ופרופיל
        </h1>
        <p className="mt-1 text-muted-foreground">
          מעלים קובץ פעם אחת — הסוכן בונה פרופיל קריירה ומחשב התאמות.
        </p>
      </div>
      {token && <ResumeManager token={token} />}
    </AppShell>
  );
}
