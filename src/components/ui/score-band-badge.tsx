interface ScoreBandBadgeProps {
  label: string;
  color: string;
  compact?: boolean;
  className?: string;
}

export function ScoreBandBadge({ label, color, compact = false, className }: ScoreBandBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold text-white ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} ${className ?? ''}`}
      style={{
        backgroundColor: color,
        borderColor: `${color}66`,
        boxShadow: `0 10px 24px ${color}22`,
      }}
    >
      {label}
    </span>
  );
}
