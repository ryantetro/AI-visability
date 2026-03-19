'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Search, Users } from 'lucide-react';
import { SectionTitle } from '@/components/app/dashboard-primitives';
import type { CompetitorComparisonData } from '@/types/competitors';
import { AddCompetitorForm } from './add-competitor-form';
import { CompetitorKpiRow } from './competitor-kpi-row';
import { BattleCard } from './battle-card';
import { EngineHeatmap } from './engine-heatmap';
import { ShareOfVoiceDonut } from './share-of-voice-donut';

interface CompetitorsDashboardProps {
  domain: string;
}

export function CompetitorsDashboard({ domain }: CompetitorsDashboardProps) {
  const [data, setData] = useState<CompetitorComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const battleCardsRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitors/list?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to load competitors');
      }
      const result: CompetitorComparisonData = await res.json();
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Poll for scanning competitors
  useEffect(() => {
    if (!data) return;
    const hasScanning = data.competitors.some((c) => c.status === 'scanning');
    if (!hasScanning) return;

    const interval = setInterval(() => void fetchData(), 5000);
    return () => clearInterval(interval);
  }, [data, fetchData]);

  const handleAdd = async (competitorUrl: string) => {
    const res = await fetch('/api/competitors/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorUrl, domain }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to add competitor');
    }

    const result = await res.json();
    const addedId = result.id as string;

    setShowAddForm(false);
    setNewlyAddedId(addedId);
    await fetchData();

    // Scroll the new battle card into view after render
    requestAnimationFrame(() => {
      const el = document.getElementById(`competitor-${addedId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  // Clear the newly-added highlight after the scan completes
  useEffect(() => {
    if (!newlyAddedId || !data) return;
    const comp = data.competitors.find((c) => c.id === newlyAddedId);
    if (comp && comp.status !== 'scanning' && comp.status !== 'pending') {
      setNewlyAddedId(null);
    }
  }, [data, newlyAddedId]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to delete');
    }
    await fetchData();
  };

  const handleRescan = async (id: string) => {
    const res = await fetch(`/api/competitors/${id}/rescan`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to start rescan');
    }
    await fetchData();
  };

  const handleScanComplete = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">
        Loading competitor data...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const usedSlots = data.competitors.length;
  const maxSlots = 3;
  const hasCompetitors = usedSlots > 0;
  const hasCompleteCompetitors = data.competitors.some((c) => c.status === 'complete');
  const noUserScan = data.userBrand.overallScore === 0 && !data.userBrand.mentionSummary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          eyebrow="Competitors"
          title="Competitor Analysis"
          description="Track up to 3 competitors with full AI visibility scans and side-by-side comparisons."
        />
        {hasCompetitors && usedSlots < maxSlots && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <Plus className="h-3 w-3" />
            Add Competitor
          </button>
        )}
      </div>

      {/* No user scan warning */}
      {noUserScan && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[12px] text-amber-300">
          Run a scan on <span className="font-semibold">{domain}</span> first to enable score comparisons.
        </div>
      )}

      {/* Scanning indicator banner */}
      {!showAddForm && data.competitors.some((c) => c.status === 'scanning') && (
        <div className="flex items-center gap-3 rounded-xl border border-[#356df4]/20 bg-[#356df4]/[0.06] px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#356df4]" />
          <p className="text-[12px] text-zinc-300">
            Scanning competitor{data.competitors.filter((c) => c.status === 'scanning').length > 1 ? 's' : ''}... This usually takes 1-2 minutes.
          </p>
        </div>
      )}

      {/* Add competitor form */}
      {showAddForm && (
        <AddCompetitorForm
          domain={domain}
          usedSlots={usedSlots}
          maxSlots={maxSlots}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Empty state */}
      {!hasCompetitors && !showAddForm && (
        <EmptyState onAdd={() => setShowAddForm(true)} />
      )}

      {/* KPI Row */}
      {hasCompleteCompetitors && <CompetitorKpiRow data={data} />}

      {/* Share of Voice */}
      {hasCompleteCompetitors && <ShareOfVoiceDonut data={data} />}

      {/* Battle Cards */}
      {hasCompetitors && (
        <div ref={battleCardsRef} className="space-y-4">
          {data.competitors.map((comp, i) => (
            <div key={comp.id} id={`competitor-${comp.id}`}>
              <BattleCard
                userBrand={data.userBrand}
                competitor={comp}
                index={i}
                onDelete={handleDelete}
                onRescan={handleRescan}
                onScanComplete={handleScanComplete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Engine Heatmap */}
      {hasCompleteCompetitors && <EngineHeatmap data={data} />}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Users className="h-6 w-6 text-zinc-400" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">No competitors tracked</h3>
      <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-6 text-zinc-500">
        Add up to 3 competitor URLs to run full AI visibility scans and get side-by-side comparisons with animated battle cards, heatmaps, and share of voice charts.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Search className="h-4 w-4" />
        Add your first competitor
      </button>
    </div>
  );
}
