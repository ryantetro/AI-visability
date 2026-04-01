'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Save, Shield } from 'lucide-react';
import { OptimizeTabGuide } from '@/app/optimize/components/optimize-tab-guide';
import { LockedFeatureOverlay } from '@/components/ui/locked-feature-overlay';

type PositioningState = {
  tagline: string;
  description: string;
  differentiators: string[];
  targetAudience: string;
  category: string;
  negativeAssociations: string[];
};

const EMPTY_STATE: PositioningState = {
  tagline: '',
  description: '',
  differentiators: [],
  targetAudience: '',
  category: '',
  negativeAssociations: [],
};

function linesToArray(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function BrandPanel({ domain, locked }: { domain: string; locked: boolean }) {
  const [form, setForm] = useState<PositioningState>(EMPTY_STATE);
  const [loading, setLoading] = useState(!locked);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (locked) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/optimize/brand-positioning?domain=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load positioning');
        }

        const payload = await response.json();
        if (!cancelled) {
          setForm(payload.positioning as PositioningState);
        }
      } catch {
        if (!cancelled) {
          setForm(EMPTY_STATE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [domain, locked]);

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/8 bg-white/[0.03]">
        <div className="space-y-4 p-6 opacity-25 blur-[1px]">
          <div className="h-6 w-44 rounded-full bg-white/10" />
          <div className="h-24 rounded-[1.2rem] bg-white/8" />
          <div className="h-48 rounded-[1.2rem] bg-white/8" />
        </div>
        <LockedFeatureOverlay
          featureName="Brand Check"
          requiredTier="pro"
          variant="inline"
        />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/optimize/brand-positioning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          tagline: form.tagline,
          description: form.description,
          differentiators: form.differentiators,
          targetAudience: form.targetAudience,
          category: form.category,
          negativeAssociations: form.negativeAssociations,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save positioning');
      }

      const payload = await response.json();
      setForm(payload.positioning as PositioningState);
      setMessage('Brand positioning saved.');
    } catch {
      setMessage('Unable to save brand positioning right now.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[1.4rem] border border-white/8 bg-white/[0.03]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Shield className="h-5 w-5 text-zinc-300" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Brand Narrative
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Save what you want AI to say about you</h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
              Your reference story. The Brand workspace compares live AI answers to what you save here.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save positioning
        </button>
      </div>

      <OptimizeTabGuide
        className="mt-5"
        summary="How to use this tab"
        steps={[
          'Fill the fields the way you want to be introduced in one paragraph.',
          'Save, then open Brand in the sidebar to compare to live answers.',
          'Update here whenever positioning changes.',
        ]}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Tagline</span>
          <input
            value={form.tagline}
            onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
            placeholder="Short positioning statement"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Category</span>
          <input
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
            placeholder="e.g. AI observability platform"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
            placeholder="How should the brand be described when AI engines summarize it?"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Target audience</span>
          <input
            value={form.targetAudience}
            onChange={(event) => setForm((current) => ({ ...current, targetAudience: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
            placeholder="Who is the ideal buyer or user?"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Differentiators</span>
          <textarea
            value={form.differentiators.join('\n')}
            onChange={(event) => setForm((current) => ({ ...current, differentiators: linesToArray(event.target.value) }))}
            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
            placeholder="One differentiator per line"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Negative associations to avoid</span>
          <textarea
            value={form.negativeAssociations.join('\n')}
            onChange={(event) => setForm((current) => ({ ...current, negativeAssociations: linesToArray(event.target.value) }))}
            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
            placeholder="One unwanted association per line"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
        <p className="text-sm text-zinc-400">
          {message ??
            'After saving, use the Brand workspace to compare this narrative to live AI answers side by side.'}
        </p>
        <Link
          href="/brand"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
        >
          Open current Brand workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
