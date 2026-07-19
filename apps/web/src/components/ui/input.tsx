import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm shadow-xs transition-colors',
      'placeholder:text-muted-foreground/70',
      'hover:border-input/80',
      'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
