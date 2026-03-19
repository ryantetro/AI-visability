'use client';

import { useEffect, useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { PROMPT_CATEGORIES } from '../lib/constants';
import type { PromptCategory, PromptMonitoringData } from '../lib/types';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';

export function PromptLibraryPanel({ domain }: { domain: string }) {
  const [data, setData] = useState<PromptMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState<PromptCategory>('custom');
  const [addingPrompt, setAddingPrompt] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PromptCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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

  if (loading) return null;

  const prompts = data?.prompts ?? [];
  const results = data?.results ?? [];
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
        <button type="button" className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-2 text-[11px] font-semibold text-[#d8b4fe] transition-colors hover:bg-[#a855f7]/16">
          <Sparkles className="h-3 w-3" />
          Suggest prompts
        </button>
      </div>

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
        <p className="mt-5 text-center text-[12px] text-zinc-500">No prompts yet. Add prompts above to start tracking how AI engines mention your brand.</p>
      )}
    </DashboardPanel>
  );
}
