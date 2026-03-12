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
            'animate-fade-in flex items-center gap-4 py-3.5',
            i < checks.length - 1 && 'border-b border-border',
          )}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <StatusIcon status={check.status} />
          <span
            className="text-sm leading-relaxed"
            style={{
              color: check.status === 'done'
                ? 'var(--text-secondary)'
                : check.status === 'running'
                  ? 'var(--text-primary)'
                  : check.status === 'error'
                    ? 'var(--color-error)'
                    : 'var(--text-tertiary)',
              fontWeight: check.status === 'running' ? 600 : 500,
            }}
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
        className="h-4 w-4 shrink-0 animate-check-done"
        style={{ color: 'var(--color-primary-600)' }}
        strokeWidth={3}
      />
    );
  }
  if (status === 'running') {
    return (
      <LoaderCircle
        className="h-4 w-4 shrink-0 animate-spin"
        style={{ color: 'var(--color-primary-600)' }}
        strokeWidth={2.5}
      />
    );
  }
  if (status === 'error') {
    return (
      <X
        className="h-4 w-4 shrink-0"
        style={{ color: 'var(--color-error)' }}
        strokeWidth={3}
      />
    );
  }
  return (
    <div
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        backgroundColor: 'rgba(120, 113, 108, 0.65)',
      }}
    />
  );
}
