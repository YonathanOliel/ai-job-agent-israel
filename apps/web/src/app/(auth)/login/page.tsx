'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ההתחברות נכשלה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-7 text-center lg:text-right">
        <h1 className="text-2xl font-extrabold tracking-tight">ברוכים השבים</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">התחברו כדי להמשיך למשרות שלכם.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">אימייל</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            className="text-left"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">סיסמה</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting} className="mt-1">
          {submitting ? 'מתחברים…' : 'התחברות'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        עדיין אין לכם חשבון?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          הרשמה חינם
        </Link>
      </p>
    </AuthShell>
  );
}
