'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const strong = useMemo(() => password.length >= 8, [password]);
  const touched = password.length > 0;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!strong) {
      setError('הסיסמה צריכה להכיל לפחות 8 תווים.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName || undefined);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ההרשמה נכשלה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-7 text-center lg:text-right">
        <h1 className="text-2xl font-extrabold tracking-tight">יצירת חשבון</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          דקה אחת, וכבר מתחילים למצוא משרות מתאימות.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">שם מלא</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="ישראל ישראלי"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            placeholder="לפחות 8 תווים"
            required
            aria-invalid={touched && !strong}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p
            className={cn(
              'flex items-center gap-1.5 text-xs',
              touched
                ? strong
                  ? 'text-success'
                  : 'text-muted-foreground'
                : 'text-muted-foreground',
            )}
          >
            {touched && strong && <Check className="size-3.5" aria-hidden />}
            {strong ? 'סיסמה תקינה' : 'לפחות 8 תווים'}
          </p>
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
          {submitting ? 'יוצרים חשבון…' : 'הרשמה חינם'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        כבר יש לכם חשבון?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          התחברות
        </Link>
      </p>
    </AuthShell>
  );
}
