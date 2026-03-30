'use client';

import { useEffect, useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { ExportButton } from '@/components/ui/export-button';
import { cn } from '@/lib/utils';
import { PROMPT_CATEGORIES } from '../lib/constants';
import type { PromptCategory, PromptMonitoringData } from '../lib/types';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';

export function PromptLibraryPanel({
  domain,
  tier,
  maxPrompts,
  onOpenUnlock,
}: {
  domain: string;
  tier?: string;
  maxPrompts?: number;
  onOpenUnlock?: () => void;
}) {
  const [data, setData] = useState<PromptMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState<PromptCategory>('custom');
  const [addingPrompt, setAddingPrompt] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PromptCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ text: string; category: string }[] | null>(null);
  const [suggestSource, setSuggestSource] = useState<'llm' | 'heuristic' | null>(null);
  const [addingSuggestedKey, setAddingSuggestedKey] = useState<string | null>(null);
  const [addingAllSuggested, setAddingAllSuggested] = useState(false);

  const normalizeSuggestionKey = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
      if (res.ok) setData(await res.json());
    } catch { /* silently fail */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddPrompt = async () => {
    if (!newPrompt.trim() || newPrompt.trim().length < 5) { setAddError('Prompt must be at least 5 characters.'); return; }
    setAddingPrompt(true); setAddError(null);
    try {
      const cat = newCategory === 'all' ? 'custom' : newCategory;
      const res = await fetch('/api/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, promptText: newPrompt.trim(), category: cat }) });
      if (res.ok) { setNewPrompt(''); await fetchData(); } else { const err = await res.json(); setAddError(err.error || 'Failed to add prompt.'); }
    } catch { setAddError('Network error.'); } finally { setAddingPrompt(false); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try { await fetch(`/api/prompts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) }); await fetchData(); } catch { /* silently fail */ }
  };

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/prompts/${id}`, { method: 'DELETE' }); await fetchData(); } catch { /* silently fail */ }
  };

  const handleStartEdit = (id: string, text: string) => { setEditingId(id); setEditText(text); };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim() || editText.trim().length < 5) return;
    try { await fetch(`/api/prompts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptText: editText.trim() }) }); setEditingId(null); await fetchData(); } catch { /* silently fail */ }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    try { await fetch(`/api/prompts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category }) }); await fetchData(); } catch { /* silently fail */ }
  };

  const handleSuggestPrompts = async () => {
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const res = await fetch('/api/prompts/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSuggestError(typeof payload.error === 'string' ? payload.error : 'Could not suggest prompts.');
        setSuggestions(null);
        setSuggestSource(null);
        return;
      }
      const list = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      setSuggestions(list);
      const src = payload.source === 'llm' || payload.source === 'heuristic' ? payload.source : null;
      setSuggestSource(list.length > 0 ? src : null);
      if (list.length === 0) {
        setSuggestError('No new prompts to add — try editing your scan or removing prompts you no longer need.');
      }
    } catch {
      setSuggestError('Network error.');
      setSuggestions(null);
      setSuggestSource(null);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAddSuggested = async (text: string, category: string) => {
    const key = normalizeSuggestionKey(text);
    setAddingSuggestedKey(key);
    setSuggestError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, promptText: text.trim(), category }),
      });
      if (res.ok) {
        setSuggestions((prev) => (prev ? prev.filter((s) => normalizeSuggestionKey(s.text) !== key) : null));
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setSuggestError(typeof err.error === 'string' ? err.error : 'Failed to add prompt.');
      }
    } catch {
      setSuggestError('Network error.');
    } finally {
      setAddingSuggestedKey(null);
    }
  };

  const handleAddAllSuggested = async () => {
    if (!suggestions?.length) return;
    setAddingAllSuggested(true);
    setSuggestError(null);
    try {
      for (const s of suggestions) {
        const res = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, promptText: s.text, category: s.category }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setSuggestError(typeof err.error === 'string' ? err.error : 'Failed to add a prompt.');
          await fetchData();
          setSuggestions([]);
          setSuggestSource(null);
          return;
        }
      }
      setSuggestions([]);
      setSuggestSource(null);
      await fetchData();
    } catch {
      setSuggestError('Network error.');
      await fetchData();
    } finally {
      setAddingAllSuggested(false);
    }
  };

  if (loading) return null;

  const prompts = data?.prompts ?? [];
  const results = data?.results ?? [];
  const atPromptLimit = maxPrompts != null && maxPrompts > 0 && prompts.length >= maxPrompts;
  const filteredPrompts = activeTab === 'all' ? prompts : prompts.filter((p) => p.category === activeTab);

  const promptStats = filteredPrompts.map((p) => {
    const pr = results.filter((r) => r.promptId === p.id);
    const mentionCount = pr.filter((r) => r.mentioned).length;
    return { ...p, totalResults: pr.length, mentionCount, mentionRate: pr.length > 0 ? Math.round((mentionCount / pr.length) * 100) : null };
  });

  const categoryCounts: Record<string, number> = { all: prompts.length };
  for (const p of prompts) { categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1; }

  return (
    <DashboardPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle eyebrow="Prompt Library" title="Prompt Monitoring" description="Manage prompts to track how AI engines mention your brand over time." />
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleSuggestPrompts}
            disabled={suggestLoading || !domain}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-2 text-[11px] font-semibold text-[#d8b4fe] transition-colors hover:bg-[#a855f7]/16 disabled:opacity-45 disabled:pointer-events-none"
          >
            <Sparkles className="h-3 w-3" />
            {suggestLoading ? 'Suggesting…' : 'Suggest prompts'}
          </button>
          <ExportButton
            exportType="prompts"
            domain={domain}
            featureGate="data_export"
          />
        </div>
      </div>

      {/* Usage limit bar */}
      {maxPrompts != null && maxPrompts > 0 && (
        (() => {
          const count = prompts.length;
          const pct = Math.min(Math.round((count / maxPrompts) * 100), 100);
          const isNearLimit = pct >= 80;
          const isAtLimit = pct >= 100;
          const nextTierLimits: Record<string, { limit: number; name: string }> = {
            free: { limit: 25, name: 'Starter' },
            starter: { limit: 75, name: 'Pro' },
            pro: { limit: 200, name: 'Growth' },
          };
          const next = tier ? nextTierLimits[tier] : null;
          return (
            <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn('font-medium', isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-zinc-400')}>
                  {count} / {maxPrompts} prompts used
                </span>
                {isNearLimit && !isAtLimit && next && (
                  <span className="text-amber-400/80">Running low — upgrade for {next.limit} prompts</span>
                )}
                {isAtLimit && next && onOpenUnlock && (
                  <button type="button" onClick={onOpenUnlock} className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-medium">
                    Limit reached — upgrade to {next.name}
                    <Sparkles className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-[#a855f7]')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()
      )}

      {suggestError && (
        <p className={cn('mt-3 text-[11px]', suggestions && suggestions.length > 0 ? 'text-amber-400/90' : 'text-red-400')}>
          {suggestError}
        </p>
      )}

      {suggestions != null && suggestions.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#a855f7]/25 bg-[#a855f7]/[0.06] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-[#e9d5ff]">Suggested prompts</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {suggestSource === 'llm'
                  ? 'From your latest scan using AI.'
                  : 'From your latest scan (rule-based). Add an OpenAI key for richer suggestions.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setSuggestions(null); setSuggestSource(null); setSuggestError(null); }}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[10px] font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleAddAllSuggested}
                disabled={atPromptLimit || addingAllSuggested || addingSuggestedKey != null}
                className="rounded-lg bg-[#d6d6d6] px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-white disabled:opacity-45"
              >
                {addingAllSuggested ? 'Adding…' : `Add all (${suggestions.length})`}
              </button>
            </div>
          </div>
          {atPromptLimit && (
            <p className="mt-2 text-[10px] text-amber-400/90">Prompt limit reached — delete a prompt or upgrade to add these.</p>
          )}
          <ul className="mt-3 max-h-[220px] space-y-2 overflow-y-auto">
            {suggestions.map((s) => {
              const rowKey = normalizeSuggestionKey(s.text);
              const busy = addingSuggestedKey === rowKey || addingAllSuggested;
              return (
                <li
                  key={rowKey}
                  className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2"
                >
                  <p className="min-w-0 flex-1 text-[12px] leading-snug text-zinc-200">{s.text}</p>
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-zinc-500">{s.category}</span>
                  <button
                    type="button"
                    onClick={() => handleAddSuggested(s.text, s.category)}
                    disabled={atPromptLimit || busy}
                    className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
                  >
                    {busy ? '…' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex gap-1 border-b border-white/8 pb-px">
        {PROMPT_CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setActiveTab(cat.id)} className={cn('px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px', activeTab === cat.id ? 'border-[#a855f7] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300')}>
            {cat.label}
            {(categoryCounts[cat.id] ?? 0) > 0 && <span className="ml-1.5 text-[9px] text-zinc-600">{categoryCounts[cat.id]}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as PromptCategory)} className="shrink-0 rounded-lg border border-white/10 bg-[#1b1b1c] px-2 py-2.5 text-[11px] text-zinc-300 focus:outline-none">
          <option value="brand">Brand</option>
          <option value="competitor">Competitor</option>
          <option value="industry">Industry</option>
          <option value="custom">Custom</option>
        </select>
        <input type="text" value={newPrompt} onChange={(e) => { setNewPrompt(e.target.value); setAddError(null); }} onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()} placeholder="e.g. What are the best AI visibility tools?" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1b1b1c] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#a855f7]/40" />
        <button type="button" onClick={handleAddPrompt} disabled={addingPrompt} className="shrink-0 rounded-lg bg-[#d6d6d6] px-4 py-2.5 text-[13px] font-medium text-black transition-colors hover:bg-white disabled:opacity-50">
          <Plus className="inline h-3.5 w-3.5 mr-1" />Add
        </button>
      </div>
      {addError && <p className="mt-1.5 text-[11px] text-red-400">{addError}</p>}

      {promptStats.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {promptStats.map((p) => (
            <div key={p.id} className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleToggle(p.id, p.active)} className={cn('h-4 w-7 shrink-0 rounded-full transition-colors', p.active ? 'bg-[#25c972]' : 'bg-zinc-600')}>
                  <span className={cn('block h-3 w-3 rounded-full bg-white transition-transform', p.active ? 'translate-x-3.5' : 'translate-x-0.5')} />
                </button>
                <div className="min-w-0 flex-1">
                  {editingId === p.id ? (
                    <div className="flex gap-1.5">
                      <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(p.id); if (e.key === 'Escape') setEditingId(null); }} autoFocus className="min-w-0 flex-1 rounded border border-white/15 bg-[#1b1b1c] px-2 py-1 text-[12px] text-zinc-100 focus:outline-none" />
                      <button type="button" onClick={() => handleSaveEdit(p.id)} className="text-[10px] text-[#25c972] hover:underline">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-[10px] text-zinc-500 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <p className={cn('text-[12px] truncate cursor-pointer hover:text-white transition-colors', p.active ? 'text-zinc-200' : 'text-zinc-500')} onClick={() => handleStartEdit(p.id, p.promptText)} title="Click to edit">{p.promptText}</p>
                  )}
                  <div className="mt-0.5 flex items-center gap-2">
                    <select value={p.category} onChange={(e) => handleCategoryChange(p.id, e.target.value)} className="rounded border-none bg-transparent px-0 py-0 text-[9px] uppercase tracking-wider text-zinc-600 focus:outline-none cursor-pointer hover:text-zinc-400">
                      <option value="brand">Brand</option>
                      <option value="competitor">Competitor</option>
                      <option value="industry">Industry</option>
                      <option value="custom">Custom</option>
                    </select>
                    {p.totalResults > 0 && <span className="text-[10px] text-zinc-600">{p.mentionRate}% of {p.totalResults} checks</span>}
                  </div>
                </div>
                {p.mentionRate !== null && (
                  <span className={cn('shrink-0 text-[11px] font-semibold tabular-nums', p.mentionRate >= 60 ? 'text-[#25c972]' : p.mentionRate >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]')}>{p.mentionRate}%</span>
                )}
                <button type="button" onClick={() => handleDelete(p.id)} className="shrink-0 text-zinc-600 transition-colors hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Mention rate by engine</p>
          <div className="flex flex-wrap gap-2">
            {AI_ENGINES.map((engine) => {
              const engineResults = results.filter((r) => r.engine === engine);
              if (engineResults.length === 0) return null;
              const mentioned = engineResults.filter((r) => r.mentioned).length;
              const rate = Math.round((mentioned / engineResults.length) * 100);
              return (
                <div key={engine} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-center">
                  <p className="text-[10px] text-zinc-500">{getAIEngineLabel(engine)}</p>
                  <p className={cn('text-sm font-bold tabular-nums', rate >= 60 ? 'text-[#25c972]' : rate >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]')}>{rate}%</p>
                  <p className="text-[9px] text-zinc-600">{engineResults.length} checks</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prompts.length === 0 && (
        <div className="mt-5 rounded-xl border border-white/8 bg-[linear-gradient(180deg,rgba(168,85,247,0.06)_0%,rgba(168,85,247,0.01)_100%)] p-5 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-[#a855f7]/60" />
          <h4 className="mt-3 text-sm font-semibold text-white">Track how AI engines mention your brand</h4>
          <p className="mx-auto mt-2 max-w-[400px] text-[12px] leading-5 text-zinc-400">
            Add prompts to monitor — we'll check ChatGPT, Perplexity, Gemini, and more for mentions of your brand.
          </p>
          {maxPrompts != null && tier && (
            <p className="mt-3 text-[11px] text-zinc-500">
              You can track up to <span className="font-medium text-zinc-300">{maxPrompts}</span> prompts on your <span className="font-medium text-zinc-300">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span> plan
            </p>
          )}
          {tier && tier !== 'growth' && (() => {
            const nextLimits: Record<string, { limit: number; name: string }> = {
              free: { limit: 25, name: 'Starter' },
              starter: { limit: 75, name: 'Pro' },
              pro: { limit: 200, name: 'Growth' },
            };
            const next = nextLimits[tier];
            return next ? (
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Need more? Upgrade to track up to {next.limit} prompts
              </p>
            ) : null;
          })()}
        </div>
      )}
    </DashboardPanel>
  );
}
