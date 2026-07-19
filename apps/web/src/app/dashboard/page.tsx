'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FileText, Sparkles, Target, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { MatchCard } from '@/components/dashboard/match-card';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import type { JobMatch } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!token) return;
    setLoadingMatches(true);
    try {
      const result = await api.listMatches(token);
      setMatches(result.items);
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const generate = async () => {
    if (!token) return;
    setError(null);
    setGenerating(true);
    try {
      const result = await api.generateMatches(token);
      setMatches(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'יצירת ההתאמות נכשלה. נסו שוב.');
    } finally {
      setGenerating(false);
    }
  };

  const topScore = matches.length ? matches[0]!.overallScore : null;
  const strong = matches.filter((m) => m.overallScore >= 75).length;
  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
              שלום{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              {matches.length
                ? 'אלה המשרות שהכי שווה לך להגיש להן כרגע.'
                : 'בואו נמצא את המשרות המתאימות לך ביותר.'}
            </p>
          </div>
          <Button onClick={generate} loading={generating} size="lg" variant="gradient">
            <Sparkles className="size-[18px]" aria-hidden />
            {generating ? 'מחשבים התאמות…' : 'חישוב התאמות'}
          </Button>
        </div>

        {/* Stats */}
        {matches.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard icon={Target} label="משרות מותאמות" value={String(matches.length)} />
            <StatCard
              icon={TrendingUp}
              label="התאמה מובילה"
              value={topScore !== null ? `${topScore}` : '—'}
            />
            <StatCard icon={Sparkles} label="התאמות חזקות (75+)" value={String(strong)} />
          </div>
        )}

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" aria-hidden />
              <span className="flex-1 font-medium">{error}</span>
              <Button size="sm" variant="outline" onClick={generate}>
                נסו שוב
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {loadingMatches ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="עוד אין לך התאמות"
            description="מעלים קורות חיים פעם אחת, והסוכן יבנה פרופיל ויחשב עבורך את המשרות המתאימות ביותר."
          >
            <Link href="/resume" className={buttonVariants({ variant: 'gradient', size: 'lg' })}>
              <FileText className="size-[18px]" aria-hidden />
              העלאת קורות חיים
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} token={token!} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-2xl font-extrabold tabular-nums leading-none">{value}</span>
        <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      </span>
    </Card>
  );
}

function MatchCardSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="size-14 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </Card>
  );
}
