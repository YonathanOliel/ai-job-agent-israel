'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MatchCard } from '@/components/dashboard/match-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, api } from '@/lib/api';
import type { JobMatch } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

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
      setError(err instanceof ApiError ? err.message : 'יצירת ההתאמות נכשלה.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">טוען…</p>
      </main>
    );
  }

  const topScore = matches.length ? matches[0]!.overallScore : null;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold">סוכן העבודה החכם</h1>
            <p className="text-sm text-muted-foreground">שלום, {user.displayName ?? user.email}</p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/jobs"
              className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-secondary"
            >
              חיפוש משרות
            </Link>
            <Link
              href="/resume"
              className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-secondary"
            >
              קורות חיים
            </Link>
            <Button variant="ghost" onClick={logout}>
              התנתקות
            </Button>
          </nav>
        </div>
      </header>

      <main className="container flex flex-col gap-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">המשרות המתאימות לך</h2>
            <p className="text-muted-foreground">
              {matches.length
                ? `נמצאו ${matches.length} משרות · התאמה מובילה ${topScore}`
                : 'טרם נוצרו התאמות'}
            </p>
          </div>
          <Button onClick={generate} disabled={generating} size="lg">
            {generating ? 'מחשב התאמות…' : 'חשב התאמות'}
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {loadingMatches ? (
          <p className="text-muted-foreground">טוען התאמות…</p>
        ) : matches.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>עדיין אין התאמות</CardTitle>
              <CardDescription>
                העלה קורות חיים וצור פרופיל קריירה, ואז לחץ על &quot;חשב התאמות&quot; כדי לקבל את
                המשרות המתאימות ביותר עבורך.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/resume"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                העלאת קורות חיים
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} token={token!} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
