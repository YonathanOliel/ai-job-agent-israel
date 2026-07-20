'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ReferralForm } from '@/components/referrals/referral-form';
import { useAuth } from '@/lib/auth-context';

export default function SharePage() {
  const { token } = useAuth();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">שיתוף משרה</h1>
        <p className="mt-1 text-muted-foreground">
          ראיתם משרה טובה בקבוצה או ברשת? הדביקו אותה כאן — נוסיף אותה לכולם.
        </p>
      </div>
      {token && <ReferralForm token={token} />}
    </AppShell>
  );
}
