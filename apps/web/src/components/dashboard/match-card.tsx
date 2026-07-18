'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { JobMatch, MatchStatus } from '@/lib/api-types';
import { cn, formatShekels } from '@/lib/utils';

const DIMENSION_LABELS: Record<string, string> = {
  technology: 'טכנולוגיות',
  skill: 'כישורים',
  experience: 'ניסיון',
  salary: 'שכר',
  location: 'מיקום',
  interviewProbability: 'סיכוי לראיון',
};

const STATUS_LABELS: Record<MatchStatus, string> = {
  NEW: 'חדש',
  VIEWED: 'נצפה',
  SAVED: 'שמור',
  APPLIED: 'הוגש',
  DISMISSED: 'הוסר',
};

const SHOWN_DIMENSIONS = ['technology', 'experience', 'salary', 'location', 'interviewProbability'];

function scoreVariant(score: number): 'success' | 'default' | 'warning' {
  if (score >= 75) return 'success';
  if (score >= 50) return 'default';
  return 'warning';
}

export function MatchCard({ match, token }: { match: JobMatch; token: string }) {
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [busy, setBusy] = useState(false);
  const { job, scores } = match;

  const changeStatus = async (next: MatchStatus) => {
    setBusy(true);
    try {
      const updated = await api.updateMatchStatus(token, match.jobId, next);
      setStatus(updated.status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'text-3xl font-bold tabular-nums',
                match.overallScore >= 75
                  ? 'text-emerald-600'
                  : match.overallScore >= 50
                    ? 'text-primary'
                    : 'text-amber-600',
              )}
            >
              {match.overallScore}
            </span>
            <span className="text-xs text-muted-foreground">התאמה</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{job.isRemote ? 'עבודה מרחוק' : (job.city ?? 'ישראל')}</Badge>
          {job.seniority && <Badge variant="outline">{job.seniority}</Badge>}
          {(job.salaryMin || job.salaryMax) && (
            <Badge variant="outline">
              <span className="ltr-inline">
                {formatShekels(job.salaryMin)}–{formatShekels(job.salaryMax)}
              </span>
            </Badge>
          )}
          <Badge variant={status === 'NEW' ? 'secondary' : 'default'}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          {SHOWN_DIMENSIONS.map((key) => {
            const dim = scores.dimensions[key];
            if (!dim) return null;
            return (
              <div key={key} className="flex items-start gap-3">
                <Badge
                  variant={scoreVariant(dim.score)}
                  className="min-w-11 justify-center tabular-nums"
                >
                  {dim.score}
                </Badge>
                <div className="text-sm">
                  <span className="font-medium">{DIMENSION_LABELS[key] ?? key}: </span>
                  <span className="text-muted-foreground">{dim.explanation}</span>
                </div>
              </div>
            );
          })}
        </div>

        {scores.missingSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">חסר:</span>
            {scores.missingSkills.slice(0, 8).map((skill) => (
              <Badge key={skill} variant="warning" className="ltr-inline">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant={status === 'SAVED' ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => changeStatus('SAVED')}
          >
            שמירה
          </Button>
          <Button
            size="sm"
            variant={status === 'APPLIED' ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => changeStatus('APPLIED')}
          >
            סימון כהוגש
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => changeStatus('DISMISSED')}
          >
            הסרה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
