'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, api } from '@/lib/api';
import type { CareerProfile } from '@/lib/api-types';

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

const STEP_LABELS: Record<Exclude<Step, 'idle' | 'done'>, string> = {
  uploading: 'מעלה את הקובץ…',
  parsing: 'מנתח את קורות החיים…',
  generating: 'בונה פרופיל קריירה…',
};

export function ResumeManager({ token }: { token: string }) {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    api
      .getProfile(token)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setInitializing(false));
  }, [token]);

  const busy = step !== 'idle' && step !== 'done';

  const process = async () => {
    if (!file) return;
    setError(null);
    try {
      setStep('uploading');
      const resume = await api.uploadResume(token, file);
      setStep('parsing');
      await api.parseResume(token, resume.id);
      setStep('generating');
      const created = await api.generateProfile(token, resume.id);
      setProfile(created);
      setStep('done');
      setFile(null);
    } catch (err) {
      setStep('idle');
      setError(err instanceof ApiError ? err.message : 'התהליך נכשל. נסה שוב.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>העלאת קורות חיים</CardTitle>
          <CardDescription>
            העלה קובץ PDF, DOCX או TXT. המערכת תחלץ את הפרטים ותבנה עבורך פרופיל קריירה.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <div className="flex items-center gap-3">
            <Button onClick={process} disabled={!file || busy} size="lg">
              {busy ? 'מעבד…' : 'העלה ונתח'}
            </Button>
            {busy && <span className="text-sm text-muted-foreground">{STEP_LABELS[step]}</span>}
            {step === 'done' && <span className="text-sm text-emerald-600">הפרופיל עודכן ✓</span>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {initializing ? (
        <p className="text-muted-foreground">טוען פרופיל…</p>
      ) : profile ? (
        <Card>
          <CardHeader>
            <CardTitle>{profile.headline ?? 'פרופיל הקריירה שלך'}</CardTitle>
            <CardDescription>
              {[
                profile.seniority ? SENIORITY_LABELS[profile.seniority] : null,
                profile.yearsExperience !== null ? `${profile.yearsExperience} שנות ניסיון` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'פרופיל נבנה מקורות החיים שלך'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {profile.summary && <p className="text-sm text-muted-foreground">{profile.summary}</p>}

            {profile.technologies.length > 0 && (
              <ProfileTags title="טכנולוגיות" items={profile.technologies} ltr />
            )}
            {profile.skills.length > 0 && <ProfileTags title="כישורים" items={profile.skills} />}
            {profile.languages && profile.languages.length > 0 && (
              <ProfileTags title="שפות" items={profile.languages.map((l) => l.name)} />
            )}

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                עבור להתאמות ←
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            עדיין אין פרופיל. העלה קורות חיים כדי להתחיל.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfileTags({ title, items, ltr }: { title: string; items: string[]; ltr?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{title}:</span>
      {items.map((item) => (
        <Badge key={item} variant="secondary" className={ltr ? 'ltr-inline' : undefined}>
          {item}
        </Badge>
      ))}
    </div>
  );
}
