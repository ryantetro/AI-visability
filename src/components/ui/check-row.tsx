import { cn } from '@/lib/utils';

interface CheckRowProps {
  title: string;
  points: string;
  status: 'pass' | 'fail' | 'unknown';
  actualValue?: string;
  detail?: string;
  className?: string;
}

const tone = {
  pass: {
    border: 'rgba(37, 201, 114, 0.3)',
    indicator: 'var(--color-success)',
    badge: 'rgba(37, 201, 114, 0.14)',
    badgeText: 'PASS',
  },
  fail: {
    border: 'rgba(255, 82, 82, 0.3)',
    indicator: 'var(--color-error)',
    badge: 'rgba(255, 82, 82, 0.14)',
    badgeText: 'FAIL',
  },
  unknown: {
    border: 'rgba(123, 137, 171, 0.3)',
    indicator: 'var(--text-muted)',
    badge: 'rgba(123, 137, 171, 0.14)',
    badgeText: 'UNKNOWN',
  },
};

export function CheckRow({ title, points, status, actualValue, detail, className }: CheckRowProps) {
  const theme = tone[status];

  return (
    <div
      className={cn('rounded-2xl border p-4', className)}
      style={{
        borderColor: theme.border,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.022) 0%, rgba(255,255,255,0.012) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.indicator }} />
            <p className="font-medium text-[var(--text-primary)]">{title}</p>
          </div>
          {actualValue ? <p className="mt-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.016)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">{actualValue}</p> : null}
          {detail ? <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{detail}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{points}</p>
          <span className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: theme.badge, color: theme.indicator }}>
            {theme.badgeText}
          </span>
        </div>
      </div>
    </div>
  );
}
