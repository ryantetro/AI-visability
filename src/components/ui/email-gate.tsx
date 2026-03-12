'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
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
    <div
      className={cn(
        'aiso-card-soft w-full max-w-xl',
        compact ? 'rounded-2xl p-4 sm:p-5' : 'p-6',
        className
      )}
      style={{ borderRadius: '1.5rem' }}
    >
      <div className={compact ? 'mb-3' : 'mb-5'}>
        <p className="aiso-kicker">Unlock Report</p>
      </div>
      <h3 className={compact ? 'mb-1.5 text-base font-semibold tracking-tight' : 'mb-2 text-xl font-semibold tracking-tight'} style={{ color: 'var(--text-primary)' }}>
        See What To Fix
      </h3>
      <p className={compact ? 'mb-3 text-xs leading-5' : 'mb-4 text-sm'} style={{ color: 'var(--text-tertiary)' }}>
        Enter your email to unlock the full report with prioritized fixes.
      </p>
      <form onSubmit={handleSubmit} className={compact ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-3 sm:flex-row'}>
        <input
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
      {error && <p className={compact ? 'mt-1.5 text-[11px]' : 'mt-2 text-xs'} style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
