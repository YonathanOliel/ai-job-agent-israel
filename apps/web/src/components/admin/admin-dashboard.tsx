'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  Layers,
  LogOut,
  MapPin,
  Monitor,
  Search as SearchIcon,
  Sparkles,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type {
  AdminOverview,
  AdminAuditEntry,
  AdminSession,
  AdminUser,
  AuditAction,
  EmbeddingBackfillResult,
  SemanticDedupResult,
  SourceQuality,
} from '@/lib/api-types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sourceQuality, setSourceQuality] = useState<SourceQuality[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState(false);
  const [embedResult, setEmbedResult] = useState<EmbeddingBackfillResult | null>(null);
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState<SemanticDedupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, sess, userList] = await Promise.all([
        api.getAdminOverview(token),
        api.listAdminSessions(token),
        api.listAdminUsers(token, { pageSize: 50 }),
      ]);
      setData(overview);
      setSessions(sess);
      setUsers(userList.items);
      try {
        const quality = await api.getSourceQuality(token);
        setSourceQuality(quality.sources);
      } catch {
        setSourceQuality([]);
      }
    } catch {
      setError('טעינת נתוני הניהול נכשלה.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (userId: string) => {
    setRevoking(userId);
    try {
      await api.revokeUserSessions(token, userId);
      await load();
    } finally {
      setRevoking(null);
    }
  };

  const changeRole = async (userId: string, role: AdminUser['role']) => {
    setChangingRole(userId);
    try {
      await api.setUserRole(token, userId, role);
      await load();
    } finally {
      setChangingRole(null);
    }
  };

  const runEmbedding = async () => {
    setEmbedding(true);
    try {
      const result = await api.embedAllJobs(token);
      setEmbedResult(result);
    } finally {
      setEmbedding(false);
    }
  };

  const runDedup = async () => {
    setDeduping(true);
    try {
      const result = await api.dedupSemanticJobs(token);
      setDedupResult(result);
      if (result.updated > 0) {
        await load();
      }
    } finally {
      setDeduping(false);
    }
  };

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

      {/* Semantic matching engine */}
      <EmbeddingCard
        embedding={embedding}
        result={embedResult}
        activeJobs={activeJobs}
        onRun={runEmbedding}
        deduping={deduping}
        dedupResult={dedupResult}
        onDedup={runDedup}
      />

      {/* Source quality ranking */}
      <SourceQualityCard sources={sourceQuality} />

      {/* Active sessions */}
      <SessionsCard sessions={sessions} revoking={revoking} onRevoke={revoke} />

      {/* User management */}
      <UsersCard
        users={users}
        currentUserEmail={data.recentActivity[0]?.userEmail ?? null}
        changingRole={changingRole}
        onChangeRole={changeRole}
      />

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

      {/* Audit explorer */}
      <AuditExplorerCard token={token} />
    </div>
  );
}

const ASSIGNABLE_ROLES: Array<{ value: AdminUser['role']; label: string }> = [
  { value: 'CANDIDATE', label: 'מועמד' },
  { value: 'SUPPORT', label: 'תמיכה' },
  { value: 'ADMIN', label: 'מנהל' },
];

const AUDIT_FILTERS: Array<{ value: AuditAction | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'הכול' },
  { value: 'LOGIN_SUCCEEDED', label: 'התחברות' },
  { value: 'LOGIN_FAILED', label: 'התחברות נכשלה' },
  { value: 'USER_REGISTERED', label: 'הרשמה' },
  { value: 'TOKEN_REFRESHED', label: 'רענון סשן' },
  { value: 'LOGOUT', label: 'התנתקות' },
];

const AUDIT_PAGE_SIZE = 15;

function AuditExplorerCard({ token }: { token: string }) {
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listAdminAudit(token, {
        action: action === 'ALL' ? undefined : action,
        page,
        pageSize: AUDIT_PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, action, page]);

  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  const changeFilter = (value: AuditAction | 'ALL') => {
    setAction(value);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>חוקר יומן ביקורת</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {AUDIT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                action === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-input',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">אין רשומות להצגה.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  {e.action === 'LOGIN_FAILED' ? (
                    <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
                  ) : e.action === 'USER_REGISTERED' ? (
                    <UserPlus className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  )}
                  <span className="shrink-0 font-medium">
                    {ACTION_LABELS[e.action] ?? e.action}
                  </span>
                  <span className="truncate text-muted-foreground">{e.userEmail ?? '—'}</span>
                  {e.ipAddress && (
                    <span className="ltr-inline shrink-0 text-xs text-muted-foreground">
                      {e.ipAddress}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(e.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            {total} רשומות · עמוד {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              הקודם
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              הבא
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceQualityCard({ sources }: { sources: SourceQuality[] }) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>איכות מקורות איסוף</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          ציון משוקלל לכל מקור: אמינות, רלוונטיות לישראל, איכות, טריות ושיעור כפילויות נמוך. מסייע
          להחליט היכן להשקיע משאבי איסוף.
        </p>
        {sources.map((s) => (
          <div key={s.key} className="flex flex-col gap-1.5 rounded-lg border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.key}</span>
                <Badge variant="outline">{s.type}</Badge>
              </div>
              <span className="text-lg font-semibold tabular-nums">{s.scores.overall}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${s.scores.overall}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                אמינות <b className="text-foreground">{s.scores.trust}</b>
              </span>
              <span>
                ישראל <b className="text-foreground">{s.scores.israel}</b>
              </span>
              <span>
                איכות <b className="text-foreground">{s.scores.quality}</b>
              </span>
              <span>
                טריות <b className="text-foreground">{s.scores.freshness}</b>
              </span>
              <span>
                ייחודיות <b className="text-foreground">{s.scores.dedup}</b>
              </span>
              <span>
                {s.activeJobs} פעילות · {s.israelJobs} בישראל
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmbeddingCard({
  embedding,
  result,
  activeJobs,
  onRun,
  deduping,
  dedupResult,
  onDedup,
}: {
  embedding: boolean;
  result: EmbeddingBackfillResult | null;
  activeJobs: number;
  onRun: () => void;
  deduping: boolean;
  dedupResult: SemanticDedupResult | null;
  onDedup: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>מנוע ההתאמה החכם (AI)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          בניית וקטורי הטמעה לכל {activeJobs} המשרות הפעילות והפרופילים, כדי להפעיל התאמה סמנטית
          ותובנות &quot;למה אני מתאים?&quot;. פעולה חד־פעמית להרצה לאחר הגדרת מפתח ה-AI.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onRun} disabled={embedding} className="gap-2">
            <Sparkles className="size-4" aria-hidden />
            {embedding ? 'בונה הטמעות…' : 'בנה הטמעות עכשיו'}
          </Button>
          {result &&
            (result.enabled ? (
              <span className="text-sm text-success">
                הוטמעו {result.jobs.embedded}/{result.jobs.total} משרות ו-
                {result.profiles.embedded}/{result.profiles.total} פרופילים.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                מנוע ה-AI כבוי — הגדר את המפתח (OPENAI_API_KEY) כדי להפעיל.
              </span>
            ))}
        </div>
        <div className="mt-1 flex flex-col gap-3 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            איחוד כפילויות סמנטי: זיהוי אותה משרה שפורסמה במספר מקורות בניסוח שונה (לפי דמיון וקטורי
            + התאמת חברה) ואיחודה לישות קנונית אחת.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onDedup} disabled={deduping} variant="outline" className="gap-2">
              <Layers className="size-4" aria-hidden />
              {deduping ? 'מאחד כפילויות…' : 'אחד כפילויות סמנטית'}
            </Button>
            {dedupResult &&
              (dedupResult.enabled ? (
                <span className="text-sm text-success">
                  אוחדו {dedupResult.duplicates} כפילויות ב-{dedupResult.groups} קבוצות (מתוך{' '}
                  {dedupResult.scanned} נסרקו).
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <AlertCircle className="size-4 shrink-0" aria-hidden />
                  דורש הטמעות — הפעל תחילה את מנוע ה-AI.
                </span>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersCard({
  users,
  currentUserEmail,
  changingRole,
  onChangeRole,
}: {
  users: AdminUser[];
  currentUserEmail: string | null;
  changingRole: string | null;
  onChangeRole: (userId: string, role: AdminUser['role']) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול משתמשים ({users.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין משתמשים להצגה.</p>
        ) : (
          users.map((u) => {
            const isOwner = u.role === 'SUPER_ADMIN';
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {u.displayName ?? u.email}
                    {u.email === currentUserEmail && (
                      <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                        (אתה)
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground ltr-inline">
                    {u.email}
                  </span>
                </div>
                {isOwner ? (
                  <Badge variant="default">סופר-אדמין</Badge>
                ) : (
                  <select
                    value={u.role}
                    disabled={changingRole === u.id}
                    onChange={(e) => onChangeRole(u.id, e.target.value as AdminUser['role'])}
                    className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-xs transition-colors hover:border-input/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function SessionsCard({
  sessions,
  revoking,
  onRevoke,
}: {
  sessions: AdminSession[];
  revoking: string | null;
  onRevoke: (userId: string) => void;
}) {
  const byUser = new Map<string, { email: string; count: number; latest: string }>();
  for (const s of sessions) {
    const entry = byUser.get(s.userId);
    if (entry) {
      entry.count += 1;
    } else {
      byUser.set(s.userId, { email: s.userEmail, count: 1, latest: s.createdAt });
    }
  }
  const users = [...byUser.entries()];

  return (
    <Card>
      <CardHeader>
        <CardTitle>סשנים פעילים ({sessions.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין סשנים פעילים.</p>
        ) : (
          users.map(([userId, u]) => (
            <div
              key={userId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">{u.email}</span>
                <Badge variant="secondary">{u.count} מכשירים</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                loading={revoking === userId}
                onClick={() => onRevoke(userId)}
                className="shrink-0 text-destructive hover:border-destructive/40 hover:text-destructive"
              >
                <LogOut className="size-4" aria-hidden />
                ניתוק
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
