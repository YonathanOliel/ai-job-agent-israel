'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Link2, Send, Share2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import type { JobReferral, ReferralStatus } from '@/lib/api-types';
import { formatDate } from '@/lib/utils';

const STATUS: Record<
  ReferralStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  ACCEPTED: { label: 'נוספה', variant: 'success' },
  PENDING: { label: 'בבדיקה', variant: 'warning' },
  REJECTED: { label: 'נדחתה', variant: 'destructive' },
};

const MIN_LENGTH = 20;

export function ReferralForm({ token }: { token: string }) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<JobReferral | null>(null);
  const [referrals, setReferrals] = useState<JobReferral[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReferrals(await api.listReferrals(token));
    } catch {
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (text.trim().length < MIN_LENGTH) {
      setError(`הדביקו לפחות ${MIN_LENGTH} תווים מתיאור המשרה.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    setLast(null);
    try {
      const result = await api.submitReferral(token, {
        text: text.trim(),
        url: url.trim() || undefined,
      });
      setLast(result);
      if (result.status === 'ACCEPTED') {
        setText('');
        setUrl('');
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'השליחה נכשלה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>הדביקו משרה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="text">תיאור המשרה</Label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder="הדביקו כאן את הטקסט של המשרה כפי שראיתם אותו — תפקיד, טכנולוגיות, מיקום ואיש קשר…"
                className="w-full resize-y rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm leading-relaxed shadow-xs transition-colors placeholder:text-muted-foreground/70 hover:border-input/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">קישור למקור (אופציונלי)</Label>
              <div className="relative">
                <Link2
                  className="pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="url"
                  dir="ltr"
                  className="pe-11 text-left"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
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

            {last && (
              <div
                className={
                  last.status === 'ACCEPTED'
                    ? 'flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm text-success'
                    : 'flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning'
                }
              >
                {last.status === 'ACCEPTED' ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                )}
                <span className="font-medium">
                  {last.status === 'ACCEPTED'
                    ? 'תודה! המשרה נוספה למאגר.'
                    : (last.rejectionReason ?? 'המשרה לא התקבלה.')}
                </span>
              </div>
            )}

            <Button type="submit" size="lg" loading={submitting} className="self-start">
              <Send className="size-[18px]" aria-hidden />
              שליחה
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">השיתופים שלי</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="עדיין לא שיתפתם"
            description="כל משרה ששיתפתם עוזרת לכל המשתמשים למצוא עבודה."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {referrals.map((r) => {
              const meta = STATUS[r.status];
              return (
                <Card key={r.id} className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {r.rawText}
                    </p>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
