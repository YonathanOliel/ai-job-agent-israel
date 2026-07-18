'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, type JobFilters } from '@/lib/api';
import type { Job, Paginated } from '@/lib/api-types';
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

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.listJobs(token, { ...applied, page, pageSize: PAGE_SIZE }));
    } catch {
      setError('טעינת המשרות נכשלה.');
    } finally {
      setLoading(false);
    }
  }, [token, applied, page]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied({
      search: search || undefined,
      city: city || undefined,
      technology: technology || undefined,
      seniority: seniority || undefined,
      isRemote: isRemote || undefined,
    });
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              placeholder="חיפוש חופשי: תפקיד, חברה, טכנולוגיה…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SENIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input
                  id="remote"
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="remote">עבודה מרחוק בלבד</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">חיפוש</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                ניקוי
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">טוען משרות…</p>
      ) : data && data.items.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">נמצאו {data.total} משרות</p>
          <div className="flex flex-col gap-4">
            {data.items.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              הקודם
            </Button>
            <span className="text-sm text-muted-foreground">
              עמוד {page} מתוך {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              הבא
            </Button>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">לא נמצאו משרות התואמות את החיפוש.</p>
      )}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
          {job.postedAt && (
            <span className="text-xs text-muted-foreground">{formatDate(job.postedAt)}</span>
          )}
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
          {job.technologies.slice(0, 5).map((tech) => (
            <Badge key={tech} variant="secondary" className="ltr-inline">
              {tech}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            צפייה והגשה למשרה ↗
          </a>
        )}
      </CardContent>
    </Card>
  );
}
