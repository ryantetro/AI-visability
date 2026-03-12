interface FixItemProps {
  rank: number;
  label: string;
  instruction: string;
  pointsAvailable: number;
  effort: number;
  roi: number;
}

export function FixItem({ rank, label, instruction, pointsAvailable, effort, roi }: FixItemProps) {
  return (
    <div
      className="aiso-card-soft flex gap-4 p-5"
      style={{
        borderRadius: '1.25rem',
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: 'var(--color-primary-50)',
          color: 'var(--color-primary-600)',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 16px rgba(5, 150, 105, 0.12)',
        }}
      >
        {rank}
      </div>
      <div className="flex-1">
        <h4 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{label}</h4>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{instruction}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
            +{pointsAvailable} pts
          </span>
          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            Effort: {'●'.repeat(effort)}{'○'.repeat(5 - effort)}
          </span>
          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            ROI: {roi.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
