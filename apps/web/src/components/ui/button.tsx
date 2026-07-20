import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        // Ink primary: near-black in light, warm-white in dark — auto-inverting,
        // always high-contrast, elegant. Gold is reserved as an accent.
        primary: 'bg-foreground text-background shadow-sm hover:bg-foreground/90 hover:shadow-md',
        // Brushed-brass gradient with ink text for AA contrast on the gold.
        gradient: 'bg-brand-gradient text-[hsl(30_28%_10%)] shadow-sm hover:shadow-glow',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline:
          'border border-input bg-card text-foreground hover:border-primary/50 hover:bg-secondary/60',
        ghost: 'text-foreground hover:bg-secondary',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        default: 'h-10 px-4',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
