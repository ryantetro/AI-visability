'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterBar({ label, options, value, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {label}
      </span>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-[background-color,border-color,color,box-shadow] duration-200',
              active ? 'text-white' : 'text-[var(--text-secondary)]'
            )}
            style={{
              borderColor: active ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)',
              backgroundColor: active ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
