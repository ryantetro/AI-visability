'use client';

import { Check, LoaderCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckItem {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface ProgressChecklistProps {
  checks: CheckItem[];
}

export function ProgressChecklist({ checks }: ProgressChecklistProps) {
  return (
    <div>
      {checks.map((check, i) => (
        <div
          key={i}
          className={cn(
            'animate-fade-in flex items-center gap-3 py-3',
            i < checks.length - 1 && 'border-b border-white/[0.06]',
          )}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <StatusIcon status={check.status} />
          <span
            className={cn(
              'text-[13px] leading-relaxed',
              check.status === 'done' && 'text-zinc-400',
              check.status === 'running' && 'font-semibold text-white',
              check.status === 'error' && 'text-red-400',
              check.status === 'pending' && 'text-zinc-500'
            )}
          >
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return (
      <Check
        className="h-3.5 w-3.5 shrink-0 animate-check-done text-[#0d9488]"
        strokeWidth={3}
      />
    );
  }
  if (status === 'running') {
    return (
      <LoaderCircle
        className="h-3.5 w-3.5 shrink-0 animate-spin text-[#0d9488]"
        strokeWidth={2.5}
      />
    );
  }
  if (status === 'error') {
    return (
      <X
        className="h-3.5 w-3.5 shrink-0 text-red-400"
        strokeWidth={3}
      />
    );
  }
  return (
    <div className="h-2 w-2 shrink-0 rounded-full bg-zinc-600" />
  );
}
