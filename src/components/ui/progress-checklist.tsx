'use client';

import { Check, LoaderCircle, X } from 'lucide-react';

interface CheckItem {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface ProgressChecklistProps {
  checks: CheckItem[];
}

export function ProgressChecklist({ checks }: ProgressChecklistProps) {
  return (
    <div className="w-full max-w-xl">
      {checks.map((check, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{
            animationDelay: `${i * 50}ms`,
          }}
        >
          <div
            className="flex items-center gap-3 py-2.5"
            style={{
              borderBottom:
                i === checks.length - 1 ? 'none' : '1px solid rgba(231, 229, 228, 0.8)',
            }}
          >
            <StatusIcon status={check.status} />
            <span
              className="app-body leading-6"
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
