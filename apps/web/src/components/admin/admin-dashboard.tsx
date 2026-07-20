'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  MapPin,
  Search as SearchIcon,
  Sparkles,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { AdminOverview, AuditAction } from '@/lib/api-types';
import { formatDate } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  CANDIDATE: 'מועמדים',
  SUPPORT: 'תמיכה',
  ADMIN: 'מנהלים',
  SUPER_ADMIN: 'סופר-אדמין',
};

const ACTION_LABELS: Record<AuditAction, string> = {
  USER_REGISTERED: 'הרשמה',
  LOGIN_SUCCEEDED: 'התחברות',
  LOGIN_FAILED: 'התחברות נכשלה',
  TOKEN_REFRESHED: 'רענון סשן',
  LOGOUT: 'התנתקות',
};

export function AdminDashboard({ token }: { token: string }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAdminOverview(token));
    } catch {
      setError('טעינת נתוני הניהול נכשלה.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 font-medium">{error ?? 'אין נתונים'}</span>
        </CardContent>
      </Card>
    );
  }

  const activeJobs = data.jobs.totals.active;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="משתמשים"
          value={data.users.total}
          hint={`+${data.users.newLast24h} ב-24ש׳`}
        />
        <Stat icon={Activity} label="סשנים פעילים" value={data.sessions.active} />
        <Stat
          icon={Building2}
          label="משרות פעילות"
          value={activeJobs}
          hint={`${data.jobs.companies} חברות`}
        />
        <Stat icon={Gauge} label="ציון איכות ממוצע" value={data.jobs.avgQualityScore} />
      </div>

      {/* System health */}
      <Card>
        <CardHeader>
          <CardTitle>בריאות המערכת</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          <HealthPill icon={Database} label="בסיס נתונים" state={data.system.database} />
          <HealthPill icon={SearchIcon} label="חיפוש" state={data.system.search} />
          <HealthPill
            icon={MapPin}
            label="משרות בישראל"
            state="up"
            valueLabel={`${data.jobs.israel.located} · ${data.jobs.israel.remote} מרחוק`}
          />
          <HealthPill
            icon={Sparkles}
            label="חדשות ב-24ש׳"
            state="up"
            valueLabel={String(data.jobs.freshness.newInLast24h)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Users by role */}
        <Card>
          <CardHeader>
            <CardTitle>משתמשים לפי תפקיד</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Object.entries(data.users.byRole).map(([role, count]) => {
              const pct = data.users.total ? Math.round((count / data.users.total) * 100) : 0;
              return (
                <div key={role} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{ROLE_LABELS[role] ?? role}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-1 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
              <span>
                הרשמות 24ש׳: <b className="text-foreground">{data.auth.registrations24h}</b>
              </span>
              <span>
                התחברויות: <b className="text-foreground">{data.auth.loginSucceeded24h}</b>
              </span>
              <span>
                נכשלו: <b className="text-foreground">{data.auth.loginFailed24h}</b>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sources health */}
        <Card>
          <CardHeader>
            <CardTitle>מקורות איסוף</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין מקורות רשומים עדיין.</p>
            ) : (
              data.sources.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {s.lastStatus === 'FAILED' ? (
                      <XCircle className="size-4 text-destructive" aria-hidden />
                    ) : (
                      <CheckCircle2 className="size-4 text-success" aria-hidden />
                    )}
                    <span className="font-medium">{s.key}</span>
                    <Badge variant="outline">{s.type}</Badge>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {s.lastJobCount ?? 0} משרות
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות אחרונה</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border/60">
          {data.recentActivity.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">אין פעילות להצגה.</p>
          ) : (
            data.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  {a.action === 'LOGIN_FAILED' ? (
                    <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
                  ) : a.action === 'USER_REGISTERED' ? (
                    <UserPlus className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  )}
                  <span className="font-medium">{ACTION_LABELS[a.action] ?? a.action}</span>
                  <span className="truncate text-muted-foreground">{a.userEmail ?? '—'}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(a.createdAt)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-2xl font-extrabold tabular-nums leading-none">{value}</span>
        <span className="mt-1 text-xs text-muted-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
      </span>
    </Card>
  );
}

function HealthPill({
  icon: Icon,
  label,
  state,
  valueLabel,
}: {
  icon: LucideIcon;
  label: string;
  state: 'up' | 'down' | 'disabled';
  valueLabel?: string;
}) {
  const tone =
    state === 'up'
      ? 'text-success'
      : state === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm">
      <Icon className={`size-4 ${tone}`} aria-hidden />
      <span className="font-medium">{label}</span>
      <span className={`text-xs ${tone}`}>
        {valueLabel ?? (state === 'up' ? 'תקין' : state === 'down' ? 'תקלה' : 'כבוי')}
      </span>
    </span>
  );
}
