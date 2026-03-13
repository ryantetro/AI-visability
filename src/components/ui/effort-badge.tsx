import { cn } from '@/lib/utils';
import { EffortBand } from '@/types/score';

const styles: Record<EffortBand, { label: string; background: string; border: string; color: string }> = {
  quick: {
    label: 'Quick win',
    background: 'rgba(37, 201, 114, 0.12)',
    border: 'rgba(37, 201, 114, 0.22)',
    color: 'var(--color-success)',
  },
  medium: {
    label: 'Medium lift',
    background: 'rgba(255, 138, 30, 0.12)',
    border: 'rgba(255, 138, 30, 0.22)',
    color: 'var(--color-warning)',
  },
  technical: {
    label: 'Technical',
    background: 'rgba(255, 82, 82, 0.12)',
    border: 'rgba(255, 82, 82, 0.22)',
    color: 'var(--color-error)',
  },
};

export function EffortBadge({ effortBand, className }: { effortBand: EffortBand; className?: string }) {
  const theme = styles[effortBand];
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]', className)}
      style={{
        backgroundColor: theme.background,
        borderColor: theme.border,
        color: theme.color,
      }}
    >
      {theme.label}
    </span>
  );
}
