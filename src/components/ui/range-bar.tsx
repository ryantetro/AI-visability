interface RangeBarProps {
  label: string;
  value: number | null;
  max?: number;
  displayValue: string;
}

export function RangeBar({ label, value, max = 100, displayValue }: RangeBarProps) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const tone = pct >= 75 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#fb7185';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono text-xs text-[var(--text-tertiary)]">{displayValue}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${tone} 0%, ${tone}CC 100%)`,
          }}
        />
      </div>
    </div>
  );
}
