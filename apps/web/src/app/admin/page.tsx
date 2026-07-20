'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { useAuth } from '@/lib/auth-context';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !ADMIN_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">מרכז הבקרה</h1>
        <p className="mt-1 text-muted-foreground">סקירת מערכת, משתמשים, מקורות ופעילות בזמן אמת.</p>
      </div>
      {token && user && ADMIN_ROLES.has(user.role) && <AdminDashboard token={token} />}
    </AppShell>
  );
}
