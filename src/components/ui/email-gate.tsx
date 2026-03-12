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
}

export function EmailGate({ scanId, onSubmit, loading, compact = false, className }: EmailGateProps) {
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
        'w-full max-w-xl border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]',
        compact ? 'p-4 sm:p-5' : 'p-6',
        className
      )}
    >
      <CardHeader className={cn('p-0', compact ? 'mb-3' : 'mb-5')}>
        <p className="aiso-kicker">Unlock Report</p>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
      <h3 className={compact ? 'text-base font-semibold tracking-tight' : 'text-xl font-semibold tracking-tight'} style={{ color: 'var(--text-primary)' }}>
        See What To Fix
      </h3>
      <p className={compact ? 'text-xs leading-5' : 'text-sm'} style={{ color: 'var(--text-tertiary)' }}>
        Enter your email to unlock the full report with prioritized fixes.
      </p>
      <form onSubmit={handleSubmit} noValidate className={compact ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-3 sm:flex-row'}>
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="you@company.com"
          className={cn(
            'aiso-input flex-1 outline-none',
            compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'
          )}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'aiso-button aiso-button-primary',
            compact ? 'px-4 py-2.5 text-xs' : 'px-5 py-3 text-sm'
          )}
        >
          {loading ? '...' : 'Show Me'}
        </button>
      </form>
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
