import { cn } from '@/lib/utils';

/**
 * Circular score gauge (0–100). Uses an SVG ring whose color reflects the
 * match strength, with the number centered inside.
 */
export function ScoreRing({
  score,
  size = 56,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = size >= 56 ? 5 : 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const tone =
    clamped >= 75
      ? 'hsl(var(--success))'
      : clamped >= 50
        ? 'hsl(var(--primary))'
        : 'hsl(var(--warning))';

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ציון התאמה ${clamped} מתוך 100`}
    >
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none"
          style={{ color: tone, fontSize: size * 0.32 }}
        >
          {clamped}
        </span>
      </div>
    </div>
  );
}
