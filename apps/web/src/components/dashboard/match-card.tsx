'use client';

import { useState } from 'react';
import { Bookmark, CheckCircle2, ExternalLink, MapPin, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScoreRing } from '@/components/ui/score-ring';
import { ApiError, api } from '@/lib/api';
import type { JobMatch, MatchInsight, MatchStatus } from '@/lib/api-types';
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

function barTone(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-primary';
  return 'bg-warning';
}

export function MatchCard({ match, token }: { match: JobMatch; token: string }) {
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [busy, setBusy] = useState<MatchStatus | null>(null);
  const [insight, setInsight] = useState<MatchInsight | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const { job, scores } = match;

  const changeStatus = async (next: MatchStatus) => {
    setBusy(next);
    try {
      const updated = await api.updateMatchStatus(token, match.jobId, next);
      setStatus(updated.status);
    } finally {
      setBusy(null);
    }
  };

  const explain = async () => {
    if (insight) {
      setInsight(null);
      return;
    }
    setExplaining(true);
    setInsightError(null);
    try {
      setInsight(await api.explainMatch(token, match.jobId));
    } catch (err) {
      setInsightError(
        err instanceof ApiError && err.status === 503
          ? 'הסברי ה-AI אינם זמינים כרגע.'
          : 'לא הצלחנו להפיק הסבר. נסו שוב.',
      );
    } finally {
      setExplaining(false);
    }
  };

  return (
    <Card interactive className="animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold leading-snug">{job.title}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company}</p>
          </div>
          <ScoreRing score={match.overallScore} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="size-3" aria-hidden />
            {job.isRemote ? 'עבודה מרחוק' : (job.city ?? 'ישראל')}
          </Badge>
          {job.seniority && <Badge variant="outline">{job.seniority}</Badge>}
          {(job.salaryMin || job.salaryMax) && (
            <Badge variant="outline" className="ltr-inline">
              {formatShekels(job.salaryMin)}–{formatShekels(job.salaryMax)}
            </Badge>
          )}
          {status !== 'NEW' && (
            <Badge variant={status === 'APPLIED' ? 'success' : 'default'}>
              {STATUS_LABELS[status]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          {SHOWN_DIMENSIONS.map((key) => {
            const dim = scores.dimensions[key];
            if (!dim) return null;
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium">{DIMENSION_LABELS[key] ?? key}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{dim.score}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-700',
                      barTone(dim.score),
                    )}
                    style={{ width: `${Math.max(4, Math.min(100, dim.score))}%` }}
                  />
                </div>
                {dim.explanation && (
                  <p className="text-xs leading-relaxed text-muted-foreground">{dim.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        {scores.missingSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">כדאי להשלים:</span>
            {scores.missingSkills.slice(0, 6).map((skill) => (
              <Badge key={skill} variant="warning" className="ltr-inline">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {(insight || insightError) && (
          <div className="animate-fade-in rounded-lg border border-primary/20 bg-brand-soft p-3.5">
            {insight ? (
              <div className="flex flex-col gap-2 text-sm">
                <p className="flex items-start gap-2 leading-relaxed">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{insight.whyYouFit}</span>
                </p>
                <p className="ps-6 text-[13px] leading-relaxed text-muted-foreground">
                  {insight.whatYouMiss}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">{insightError}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            size="sm"
            variant={insight ? 'secondary' : 'gradient'}
            loading={explaining}
            onClick={explain}
          >
            <Sparkles className="size-4" aria-hidden />
            {insight ? 'הסתרת הסבר' : 'למה אני מתאים?'}
          </Button>
          <Button
            size="sm"
            variant={status === 'SAVED' ? 'primary' : 'outline'}
            loading={busy === 'SAVED'}
            onClick={() => changeStatus('SAVED')}
          >
            <Bookmark className="size-4" aria-hidden />
            שמירה
          </Button>
          <Button
            size="sm"
            variant={status === 'APPLIED' ? 'primary' : 'outline'}
            loading={busy === 'APPLIED'}
            onClick={() => changeStatus('APPLIED')}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            סימון כהוגש
          </Button>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-[13px] font-semibold transition-colors hover:border-primary/40 hover:bg-secondary/60"
            >
              <ExternalLink className="size-4" aria-hidden />
              למשרה
            </a>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="ms-auto size-9 text-muted-foreground hover:text-destructive"
            aria-label="הסרת ההתאמה"
            loading={busy === 'DISMISSED'}
            onClick={() => changeStatus('DISMISSED')}
          >
            {busy !== 'DISMISSED' && <X className="size-4" aria-hidden />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
