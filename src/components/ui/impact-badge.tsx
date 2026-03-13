import { cn } from '@/lib/utils';

export function ImpactBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
        className
      )}
      style={{
        borderColor: 'rgba(22, 183, 202, 0.22)',
        backgroundColor: 'rgba(22, 183, 202, 0.12)',
        color: 'var(--color-accent-300)',
      }}
    >
      Approx. +{value}
    </span>
  );
}
