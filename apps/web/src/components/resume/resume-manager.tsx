'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import type { CareerProfile } from '@/lib/api-types';
import { cn } from '@/lib/utils';

const SENIORITY_LABELS: Record<string, string> = {
  STUDENT: 'סטודנט',
  JUNIOR: 'זוטר',
  MID: 'ביניים',
  SENIOR: 'בכיר',
  LEAD: 'ראש צוות',
  MANAGER: 'מנהל',
  DIRECTOR: 'דירקטור',
  EXECUTIVE: 'הנהלה בכירה',
};

type Step = 'idle' | 'uploading' | 'parsing' | 'generating' | 'done';

const STEPS: Array<{ key: Exclude<Step, 'idle' | 'done'>; label: string }> = [
  { key: 'uploading', label: 'מעלה קובץ' },
  { key: 'parsing', label: 'מנתח קורות חיים' },
  { key: 'generating', label: 'בונה פרופיל' },
];

const STEP_ORDER: Step[] = ['uploading', 'parsing', 'generating', 'done'];

export function ResumeManager({ token }: { token: string }) {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getProfile(token)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setInitializing(false));
  }, [token]);

  const busy = step !== 'idle' && step !== 'done';

  const process = async (selected: File) => {
    setError(null);
    try {
      setStep('uploading');
      const resume = await api.uploadResume(token, selected);
      setStep('parsing');
      await api.parseResume(token, resume.id);
      setStep('generating');
      const created = await api.generateProfile(token, resume.id);
      setProfile(created);
      setStep('done');
      setFile(null);
    } catch (err) {
      setStep('idle');
      setError(err instanceof ApiError ? err.message : 'התהליך נכשל. נסו שוב.');
    }
  };

  const onPick = (selected: File | null) => {
    if (!selected || busy) return;
    setFile(selected);
    void process(selected);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Upload */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>העלאת קורות חיים</CardTitle>
          <CardDescription>PDF, DOCX או TXT — עד 10MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onPick(e.dataTransfer.files?.[0] ?? null);
            }}
            disabled={busy}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-secondary/40',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary">
              {busy ? (
                <Loader2 className="size-6 animate-spin" aria-hidden />
              ) : (
                <UploadCloud className="size-6" aria-hidden />
              )}
            </span>
            <span className="text-sm">
              <span className="font-semibold text-primary">בחרו קובץ</span> או גררו לכאן
            </span>
            {file && !busy && <span className="text-xs text-muted-foreground">{file.name}</span>}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            hidden
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />

          {(busy || step === 'done') && <StepProgress step={step} />}

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <div className="lg:col-span-3">
        {initializing ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-8 w-2/3" />
            </CardContent>
          </Card>
        ) : profile ? (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  פרופיל פעיל
                </Badge>
              </div>
              <CardTitle className="mt-1">{profile.headline ?? 'פרופיל הקריירה שלך'}</CardTitle>
              <CardDescription>
                {[
                  profile.seniority ? SENIORITY_LABELS[profile.seniority] : null,
                  profile.yearsExperience !== null
                    ? `${profile.yearsExperience} שנות ניסיון`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'נבנה אוטומטית מקורות החיים שלך'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {profile.summary && (
                <p className="text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
              )}
              {profile.technologies.length > 0 && (
                <ProfileTags title="טכנולוגיות" items={profile.technologies} ltr />
              )}
              {profile.skills.length > 0 && <ProfileTags title="כישורים" items={profile.skills} />}
              {profile.languages && profile.languages.length > 0 && (
                <ProfileTags title="שפות" items={profile.languages.map((l) => l.name)} />
              )}
              <div className="pt-1">
                <Link href="/dashboard" className={buttonVariants({ variant: 'primary' })}>
                  מעבר להתאמות
                  <ArrowLeft className="size-4" aria-hidden />
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex h-full flex-col items-center justify-center border-dashed py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-primary">
              <FileText className="size-7" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-bold">עדיין אין פרופיל</p>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              העלו קורות חיים כדי שהסוכן יבנה עבורכם פרופיל קריירה ויתחיל למצוא התאמות.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepProgress({ step }: { step: Step }) {
  const current = STEP_ORDER.indexOf(step);
  return (
    <ol className="flex flex-col gap-2.5">
      {STEPS.map((s, i) => {
        const done = current > i;
        const active = step === s.key;
        return (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs transition-colors',
                done && 'bg-success text-success-foreground',
                active && 'bg-primary text-primary-foreground',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : active ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                active
                  ? 'font-semibold text-foreground'
                  : done
                    ? 'text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ProfileTags({ title, items, ltr }: { title: string; items: string[]; ltr?: boolean }) {
  const shown = useMemo(() => items.slice(0, 24), [items]);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <Badge key={item} variant="secondary" className={ltr ? 'ltr-inline' : undefined}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
