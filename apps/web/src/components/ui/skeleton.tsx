import { cn } from '@/lib/utils';

/** Shimmering placeholder used while content loads. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shimmer rounded-md bg-muted/70', className)} aria-hidden {...props} />;
}
