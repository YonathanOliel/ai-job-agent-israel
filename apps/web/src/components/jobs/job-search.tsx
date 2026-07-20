'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  SearchX,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type JobFilters } from '@/lib/api';
import type { Job, Paginated, SavedSearch, SavedSearchFilters } from '@/lib/api-types';
import { formatDate, formatShekels } from '@/lib/utils';

const PAGE_SIZE = 10;

const SENIORITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'כל הרמות' },
  { value: 'STUDENT', label: 'סטודנט' },
  { value: 'JUNIOR', label: 'זוטר' },
  { value: 'MID', label: 'ביניים' },
  { value: 'SENIOR', label: 'בכיר' },
  { value: 'LEAD', label: 'ראש צוות' },
  { value: 'MANAGER', label: 'מנהל' },
  { value: 'DIRECTOR', label: 'דירקטור' },
  { value: 'EXECUTIVE', label: 'הנהלה בכירה' },
];

export function JobSearch({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [technology, setTechnology] = useState('');
  const [seniority, setSeniority] = useState('');
  const [isRemote, setIsRemote] = useState(false);

  const [applied, setApplied] = useState<JobFilters>({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      setSavedSearches(await api.listSavedSearches(token));
    } catch {
      setSavedSearches([]);
    }
  }, [token]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.listJobs(token, { ...applied, page, pageSize: PAGE_SIZE }));
    } catch {
      setError('טעינת המשרות נכשלה. בדקו את החיבור ונסו שוב.');
    } finally {
      setLoading(false);
    }
  }, [token, applied, page]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const currentFilters = (): SavedSearchFilters => ({
    search: search || undefined,
    city: city || undefined,
    technology: technology || undefined,
    seniority: seniority || undefined,
    isRemote: isRemote || undefined,
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied(currentFilters());
  };

  const applySaved = (saved: SavedSearch) => {
    const f = saved.filters ?? {};
    setSearch(f.search ?? '');
    setCity(f.city ?? '');
    setTechnology(f.technology ?? '');
    setSeniority(f.seniority ?? '');
    setIsRemote(Boolean(f.isRemote));
    setPage(1);
    setApplied({
      search: f.search || undefined,
      city: f.city || undefined,
      technology: f.technology || undefined,
      seniority: f.seniority || undefined,
      isRemote: f.isRemote || undefined,
    });
  };

  const saveCurrent = async () => {
    if (saveName.trim().length < 2) return;
    setSaving(true);
    try {
      await api.createSavedSearch(token, { name: saveName.trim(), filters: currentFilters() });
      setSaveName('');
      setShowSave(false);
      await loadSaved();
    } finally {
      setSaving(false);
    }
  };

  const deleteSaved = async (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    try {
      await api.deleteSavedSearch(token, id);
    } catch {
      await loadSaved();
    }
  };

  const reset = () => {
    setSearch('');
    setCity('');
    setTechnology('');
    setSeniority('');
    setIsRemote(false);
    setPage(1);
    setApplied({});
  };

  const hasFilters =
    Boolean(search || city || technology || seniority || isRemote) ||
    Object.keys(applied).length > 0;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <SlidersHorizontal
                className="pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="חיפוש חופשי: תפקיד, חברה או טכנולוגיה…"
                className="h-12 pe-11 text-[15px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">עיר</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="תל אביב"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tech">טכנולוגיה</Label>
                <Input
                  id="tech"
                  dir="ltr"
                  className="text-left"
                  value={technology}
                  onChange={(e) => setTechnology(e.target.value)}
                  placeholder="react"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seniority">רמת בכירות</Label>
                <select
                  id="seniority"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs transition-colors hover:border-input/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {SENIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex h-11 w-full cursor-pointer select-none items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 text-sm transition-colors hover:border-input/80">
                  <input
                    type="checkbox"
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  עבודה מרחוק בלבד
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" className="px-6">
                חיפוש
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={reset}>
                  <X className="size-4" aria-hidden />
                  ניקוי מסננים
                </Button>
              )}
              {hasFilters && !showSave && (
                <Button
                  type="button"
                  variant="outline"
                  className="ms-auto"
                  onClick={() => setShowSave(true)}
                >
                  <BookmarkPlus className="size-4" aria-hidden />
                  שמירת חיפוש
                </Button>
              )}
            </div>

            {showSave && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-brand-soft p-2.5">
                <Input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveCurrent();
                    }
                  }}
                  placeholder="שם לחיפוש (למשל: Senior React ת״א)"
                  className="h-10 flex-1 bg-card"
                  maxLength={80}
                />
                <Button
                  type="button"
                  size="sm"
                  loading={saving}
                  disabled={saveName.trim().length < 2}
                  onClick={saveCurrent}
                >
                  שמירה
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSave(false);
                    setSaveName('');
                  }}
                >
                  ביטול
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Bookmark className="size-4" aria-hidden />
            חיפושים שמורים:
          </span>
          {savedSearches.map((s) => (
            <span
              key={s.id}
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pe-1 ps-3 text-sm transition-colors hover:border-primary/40"
            >
              <button
                type="button"
                onClick={() => applySaved(s)}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {s.name}
              </button>
              <button
                type="button"
                onClick={() => deleteSaved(s.id)}
                aria-label={`מחיקת החיפוש ${s.name}`}
                className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" aria-hidden />
            <span className="flex-1 font-medium">{error}</span>
            <Button size="sm" variant="outline" onClick={() => void fetchJobs()}>
              נסו שוב
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <JobRowSkeleton key={i} />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            נמצאו <span className="font-semibold text-foreground">{data.total}</span> משרות
          </p>
          <div className="flex flex-col gap-3">
            {data.items.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="size-4" aria-hidden />
                הקודם
              </Button>
              <span className="min-w-24 text-center text-sm text-muted-foreground">
                עמוד {page} מתוך {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                הבא
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="לא נמצאו משרות"
          description="לא מצאנו משרות שתואמות את החיפוש. נסו לצמצם מסננים או לחפש מונח אחר."
        >
          {hasFilters && (
            <Button variant="outline" onClick={reset}>
              <X className="size-4" aria-hidden />
              איפוס החיפוש
            </Button>
          )}
        </EmptyState>
      )}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <Card interactive>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-bold leading-snug">{job.title}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company}</p>
          </div>
          {job.postedAt && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(job.postedAt)}
            </span>
          )}
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
          {job.technologies.slice(0, 5).map((tech) => (
            <Badge key={tech} variant="default" className="ltr-inline">
              {tech}
            </Badge>
          ))}
        </div>

        {job.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {job.description}
          </p>
        )}

        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="size-4" aria-hidden />
            צפייה והגשה
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function JobRowSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-9 w-32 rounded-lg" />
    </Card>
  );
}
