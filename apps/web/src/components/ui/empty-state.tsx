import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Friendly empty state: icon, title, description, and optional actions. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center animate-fade-in',
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-primary">
        <Icon className="size-7" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>
      )}
    </div>
  );
}
