'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import CustomAlert from '@/components/ui/custom-alert';

interface EmailGateProps {
  scanId: string;
  onSubmit: (email: string) => void;
  loading?: boolean;
  compact?: boolean;
  className?: string;
  submitLabel?: string;
}

export function EmailGate({ scanId, onSubmit, loading, compact = false, className, submitLabel = 'Show Me' }: EmailGateProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && !input.validity.valid) {
      setError(input.validationMessage || 'Please enter a valid email');
      return;
    }
    setError('');

    try {
      const res = await fetch(`/api/scan/${scanId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to save email');
      onSubmit(email);
    } catch {
      setError('Failed to save email. Please try again.');
    }
  };

  return (
    <Card
      className={cn(
        'relative w-full max-w-xl overflow-hidden rounded-[1.9rem] border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(12,13,17,0.96)_0%,rgba(7,8,11,0.985)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_36px_rgba(0,0,0,0.28)]',
        compact ? 'p-4' : 'p-6 sm:p-7',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018)_0%,transparent_28%,transparent_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.34]"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 88px)',
          }}
        />
      </div>
      <CardHeader className={cn('p-0', compact ? 'mb-2.5' : 'mb-5')}>
        <p className="aiso-kicker">Unlock Report</p>
      </CardHeader>
      <CardContent className="relative space-y-4 p-0">
        <h3 className={compact ? 'font-display text-[1.05rem] font-semibold tracking-[-0.025em]' : 'font-display text-[clamp(1.7rem,2vw,2.2rem)] font-semibold tracking-[-0.03em]'} style={{ color: 'var(--text-primary)' }}>
          See What To Fix
        </h3>
        <p className={compact ? 'max-w-[20rem] text-[0.78rem] leading-5' : 'max-w-[30rem] text-[0.98rem] leading-7'} style={{ color: 'var(--text-tertiary)' }}>
          {compact
            ? 'Enter your email to unlock the full report and saved workspace.'
            : 'Enter your email to unlock the full report with prioritized fixes, implementation prompts, and your saved audit workspace.'}
        </p>
        <form onSubmit={handleSubmit} noValidate className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-3 sm:flex-row sm:items-center'}>
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="you@company.com"
            className={cn(
              'aiso-input min-w-0 flex-1 outline-none',
              compact ? 'px-3.5 py-2.5 text-[0.8rem]' : 'px-5 py-3.5 text-[0.95rem]'
            )}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'aiso-button aiso-button-primary',
              compact ? 'px-4 py-2.5 text-[0.78rem]' : 'px-6 py-3.5 text-sm sm:min-w-[9rem]'
            )}
          >
            {loading ? '...' : submitLabel}
          </button>
        </form>
        {!compact ? (
          <p className="text-xs leading-6 text-[var(--text-muted)]">
            No password needed. We&apos;ll unlock the audit instantly and send you a private link to come back later.
          </p>
        ) : null}
        <CustomAlert
          variant="warning"
          appearance="inline"
          description={error}
          visible={!!error}
          dismissible={false}
        />
      </CardContent>
    </Card>
  );
}
