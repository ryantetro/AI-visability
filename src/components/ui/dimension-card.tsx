'use client';

interface Check {
  id: string;
  label: string;
  verdict: 'pass' | 'fail' | 'unknown';
  points: number;
  maxPoints: number;
  detail: string;
}

interface DimensionCardProps {
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  checks: Check[];
}

function bandColor(pct: number): string {
  if (pct >= 80) return 'var(--color-band-ai-ready)';
  if (pct >= 60) return 'var(--color-band-needs-work)';
  if (pct >= 40) return 'var(--color-band-at-risk)';
  return 'var(--color-band-not-visible)';
}

export function DimensionCard({ label, score, maxScore, percentage, checks }: DimensionCardProps) {
  return (
    <div
      className="aiso-card-soft p-5 sm:p-6"
      style={{
        borderRadius: '1.25rem',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{label}</h3>
        <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {score}/{maxScore} ({percentage}%)
        </span>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden" style={{ backgroundColor: 'var(--color-neutral-100)', borderRadius: 'var(--radius-full)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: bandColor(percentage),
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.id} className="flex items-start gap-3 rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--surface-card-hover)' }}>
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-xs font-bold"
              style={{
                color: check.verdict === 'pass' ? 'var(--color-verdict-pass)' : check.verdict === 'fail' ? 'var(--color-verdict-fail)' : 'var(--color-verdict-unknown)',
                backgroundColor: check.verdict === 'pass' ? 'var(--color-primary-50)' : check.verdict === 'fail' ? 'var(--color-band-bg-not-visible)' : 'var(--color-neutral-100)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {check.verdict === 'pass' ? '✓' : check.verdict === 'fail' ? '✗' : '?'}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{
                    color: check.verdict === 'pass' ? 'var(--color-verdict-pass)' : check.verdict === 'fail' ? 'var(--color-verdict-fail)' : 'var(--text-muted)',
                  }}
                >
                  {check.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {check.points}/{check.maxPoints}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
