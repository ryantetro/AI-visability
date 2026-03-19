'use client';

import { useState } from 'react';
import { Globe2, Loader2, Plus, X } from 'lucide-react';
import { getFaviconUrl, getDomain, isValidUrl, ensureProtocol } from '@/lib/url-utils';

interface AddCompetitorFormProps {
  domain: string;
  usedSlots: number;
  maxSlots: number;
  onAdd: (competitorUrl: string) => Promise<void>;
  onCancel: () => void;
}

export function AddCompetitorForm({
  domain,
  usedSlots,
  maxSlots,
  onAdd,
  onCancel,
}: AddCompetitorFormProps) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const trimmed = url.trim();
  const previewDomain = trimmed && isValidUrl(ensureProtocol(trimmed))
    ? getDomain(ensureProtocol(trimmed)).replace(/^www\./, '')
    : null;
  const isSelfDomain = previewDomain === domain.replace(/^www\./, '');

  async function handleSubmit() {
    setError('');

    if (!trimmed) {
      setError('Enter a competitor URL');
      return;
    }

    const fullUrl = ensureProtocol(trimmed);
    if (!isValidUrl(fullUrl)) {
      setError('Enter a valid URL (e.g. competitor.com)');
      return;
    }

    if (isSelfDomain) {
      setError("You can't add your own domain as a competitor");
      return;
    }

    if (usedSlots >= maxSlots) {
      setError(`Maximum of ${maxSlots} competitors per domain`);
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(fullUrl);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Add competitor
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {usedSlots} of {maxSlots} slots used
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-[#1b1b1c] px-3">
          {previewDomain && !isSelfDomain ? (
            <img
              src={getFaviconUrl(previewDomain, 16)}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Globe2 className="h-4 w-4 shrink-0 text-zinc-500" />
          )}
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
            placeholder="competitor.com"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            disabled={submitting}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !trimmed}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}

      {isSelfDomain && !error && (
        <p className="mt-2 text-[11px] text-amber-400">
          This is your own domain
        </p>
      )}
    </div>
  );
}
