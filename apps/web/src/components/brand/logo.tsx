import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Brand mark: gradient tile + wordmark. Set `compact` to show the tile only. */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-[hsl(30_28%_10%)] shadow-sm">
        <Sparkles className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-tight">סוכן העבודה החכם</span>
          <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            משרות היי־טק בישראל
          </span>
        </span>
      )}
    </span>
  );
}
