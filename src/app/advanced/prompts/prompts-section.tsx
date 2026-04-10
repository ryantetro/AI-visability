'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Filter,
  Lightbulb,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import { PLANS } from '@/lib/pricing';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';
import { ENGINE_COLORS, PROMPT_CATEGORIES } from '../lib/constants';
import { EngineIcon } from '../panels/shared';
import { PromptVolumeTeaser } from '../panels/prompt-volume-teaser';
import type { PromptMonitoringData, PromptCategory } from '../lib/types';
import type { DashboardReportData } from '../lib/types';
import type { PlanTier } from '@/lib/pricing';
import type { AIEngine } from '@/types/ai-mentions';

/* ── Cache helpers (matches prompt-library-panel) ─────────── */

const CACHE_TTL_MS = 2 * 60 * 1000;
function cacheKey(domain: string) { return `prompt_library:${domain}`; }

function readCache(domain: string): PromptMonitoringData | null {
  try {
    const raw = localStorage.getItem(cacheKey(domain));
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as { data: PromptMonitoringData; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function writeCache(domain: string, data: PromptMonitoringData) {
  try { localStorage.setItem(cacheKey(domain), JSON.stringify({ data, cachedAt: Date.now() })); } catch {}
}

function invalidateCache(domain: string) {
  try { localStorage.removeItem(cacheKey(domain)); } catch {}
}

/* ── Modal primitives ─────────────────────────────────────── */

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Content */}
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </div>
  );
}

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] shadow-2xl shadow-black/40">
      {children}
    </div>
  );
}

/* ── Add Prompt Modal ─────────────────────────────────────── */

function AddPromptModal({
  open,
  onClose,
  onSubmit,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string, category: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>('custom');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setCategory('custom');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 5) {
      setError('Prompt must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(text.trim(), category);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add prompt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard>
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-1">
          <div>
            <h3 className="text-[17px] font-semibold text-white">Add Prompt</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
              Enter a prompt to track how AI engines respond when users ask this question.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-7 pt-5 pb-2">
          {/* Category */}
          <div>
            <label className="mb-2 block text-[12px] font-medium text-zinc-400">Topic</label>
            <div className="relative">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-zinc-200 focus:border-[#0ea5e9]/40 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/20"
              >
                <option value="brand">Brand</option>
                <option value="competitor">Competitor</option>
                <option value="industry">Industry</option>
                <option value="custom">Custom</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          {/* Prompt text */}
          <div>
            <label className="mb-2 block text-[12px] font-medium text-zinc-400">Prompt</label>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => { setText(e.target.value); setError(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && !submitting) handleSubmit(); }}
              placeholder="e.g. What are the best AI visibility tools?"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:border-[#0ea5e9]/40 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/20"
            />
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 pt-4 pb-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-[14px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0ea5e9] px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Adding...' : 'Add Prompt'}
          </button>
        </div>
      </ModalCard>
    </ModalBackdrop>
  );
}

/* ── Generate Suggestions Modal (Cognizo-inspired) ───────── */

const TOPIC_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'brand', label: 'Brand Awareness' },
  { id: 'competitor', label: 'Competitor Comparison' },
  { id: 'industry', label: 'Industry & Trends' },
  { id: 'custom', label: 'Custom Topics' },
] as const;

function SuggestModal({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (category: string) => void;
}) {
  const [topic, setTopic] = useState<string>('all');
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTopic('all'); setTopicOpen(false); setTopicSearch(''); setGenerating(false); }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!topicOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setTopicOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [topicOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (topicOpen) setTimeout(() => searchRef.current?.focus(), 30);
  }, [topicOpen]);

  const handleGenerate = () => {
    setGenerating(true);
    onGenerate(topic);
  };

  const filteredTopics = TOPIC_OPTIONS.filter(t =>
    t.label.toLowerCase().includes(topicSearch.toLowerCase()),
  );

  const selectedLabel = TOPIC_OPTIONS.find(t => t.id === topic)?.label ?? 'All';

  if (!open) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard>
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-1">
          <div>
            <h3 className="text-[18px] font-semibold text-white">Prompt Generation</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
              Choose a topic to get tailored prompt suggestions.<br />
              Accept the ones you&apos;d like to track or dismiss the rest.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-7 pt-6 pb-4">
          {/* Topics — custom searchable dropdown */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-2.5 block text-[13px] font-medium text-zinc-300">Topics</label>
            <button
              type="button"
              onClick={() => setTopicOpen(v => !v)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 py-3.5 text-left transition-colors hover:border-white/[0.15]"
            >
              <Filter className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="flex-1 text-[14px] text-zinc-200">
                Topic: {selectedLabel}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
            </button>

            {/* Dropdown popover */}
            {topicOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/[0.10] bg-[#242426] shadow-xl shadow-black/50">
                {/* Search */}
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={topicSearch}
                      onChange={e => setTopicSearch(e.target.value)}
                      placeholder="Search topics..."
                      className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>
                {/* Options */}
                <div className="max-h-[240px] overflow-y-auto py-1.5">
                  {filteredTopics.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTopic(t.id); setTopicOpen(false); setTopicSearch(''); }}
                      className={cn(
                        'flex w-full items-center justify-between px-4 py-3 text-left text-[14px] transition-colors hover:bg-white/[0.05]',
                        topic === t.id ? 'text-white' : 'text-zinc-300',
                      )}
                    >
                      <span>{t.label}</span>
                      {topic === t.id && <Check className="h-4 w-4 text-[#0ea5e9]" />}
                    </button>
                  ))}
                  {filteredTopics.length === 0 && (
                    <p className="px-4 py-3 text-[13px] text-zinc-500">No matching topics.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 pt-2 pb-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.10] px-6 py-2.5 text-[14px] font-medium text-zinc-300 transition-colors hover:border-white/[0.18] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-[14px] font-semibold text-[#1c1c1e] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </ModalCard>
    </ModalBackdrop>
  );
}

/* ── Types ────────────────────────────────────────────────── */

type PromptTab = 'active' | 'inactive' | 'suggestions';
type PromptRow = PromptMonitoringData['prompts'][number];

interface PromptsSectionProps {
  report: DashboardReportData | null;
  domain: string;
  tier: PlanTier;
  onOpenUnlock: () => void;
}

/* ================================================================
   PromptsSection — Cognizo-inspired table-centric layout with
   sidebar-driven Active / Inactive / Suggestions navigation
   ================================================================ */

export function PromptsSection({ report, domain, tier, onOpenUnlock }: PromptsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: PromptTab = tabParam === 'inactive' || tabParam === 'suggestions' ? tabParam : 'active';

  const goToTab = (t: PromptTab) => router.push(`${pathname}?tab=${t}`);

  const maxPrompts = PLANS[tier]?.prompts ?? 5;

  /* ── Data state ──────────────────────────────────────────── */
  const [data, setData] = useState<PromptMonitoringData | null>(() => readCache(domain));
  const [loading, setLoading] = useState(() => readCache(domain) === null);
  const [backgroundRunQueued, setBackgroundRunQueued] = useState(false);
  const autoRefreshRef = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── UI state ────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<PromptCategory>('all');

  /* ── Selection state ─────────────────────────────────────── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<Set<string>>(new Set());

  /* ── Modal state ─────────────────────────────────────────── */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  /* ── Inline-edit state ───────────────────────────────────── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  /* ── Suggestions state ───────────────────────────────────── */
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ text: string; category: string }[] | null>(null);
  const [suggestSource, setSuggestSource] = useState<'llm' | 'heuristic' | null>(null);
  const [addingSuggestedKey, setAddingSuggestedKey] = useState<string | null>(null);
  const [addingAllSuggested, setAddingAllSuggested] = useState(false);

  const normKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

  // Clear selection on tab change
  useEffect(() => { setSelectedIds(new Set()); setSelectedSuggestionKeys(new Set()); }, [tab]);

  /* ── Data fetching ───────────────────────────────────────── */

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const payload = await res.json();
        const queued = Boolean(payload.backgroundRunQueued);
        setData(payload);
        setBackgroundRunQueued(queued);
        writeCache(domain, payload);

        const nextResults: unknown[] = Array.isArray(payload.results) ? payload.results : [];
        if (nextResults.length > 0) {
          autoRefreshRef.current = 0;
          if (refreshTimer.current) { clearTimeout(refreshTimer.current); refreshTimer.current = null; }
        } else if (queued && autoRefreshRef.current < 3) {
          const delay = autoRefreshRef.current === 0 ? 3000 : 6000;
          autoRefreshRef.current += 1;
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => { void fetchData(); }, delay);
        }
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const cached = readCache(domain);
    if (cached) void fetchData(true);
    else void fetchData();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── CRUD handlers ───────────────────────────────────────── */

  const handleAddPrompt = useCallback(async (promptText: string, category: string) => {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, promptText, category }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.error === 'string' ? err.error : 'Failed to add prompt.');
    }
    invalidateCache(domain);
    await fetchData();
  }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      invalidateCache(domain); await fetchData();
    } catch { /* silently fail */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      invalidateCache(domain); await fetchData();
    } catch { /* silently fail */ }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim() || editText.trim().length < 5) return;
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: editText.trim() }),
      });
      setEditingId(null); invalidateCache(domain); await fetchData();
    } catch { /* silently fail */ }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      invalidateCache(domain); await fetchData();
    } catch { /* silently fail */ }
  };

  /* ── Suggestion handlers ─────────────────────────────────── */

  const handleSuggest = useCallback(async (_category?: string) => {
    setShowSuggestModal(false);
    setSuggestLoading(true); setSuggestError(null);
    try {
      const res = await fetch('/api/prompts/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSuggestError(typeof payload.error === 'string' ? payload.error : 'Could not generate suggestions.');
        setSuggestions(null); setSuggestSource(null); return;
      }
      const list = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      setSuggestions(list);
      setSuggestSource(list.length > 0 ? (payload.source === 'llm' || payload.source === 'heuristic' ? payload.source : null) : null);
      if (list.length === 0) setSuggestError('No new prompts to suggest — try removing prompts you no longer need.');
    } catch { setSuggestError('Network error.'); setSuggestions(null); setSuggestSource(null); }
    finally { setSuggestLoading(false); }
  }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (text: string, category: string) => {
    const key = normKey(text);
    setAddingSuggestedKey(key); setSuggestError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, promptText: text.trim(), category }),
      });
      if (res.ok) {
        setSuggestions(prev => prev ? prev.filter(s => normKey(s.text) !== key) : null);
        setSelectedSuggestionKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
        invalidateCache(domain); await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setSuggestError(typeof err.error === 'string' ? err.error : 'Failed to add prompt.');
      }
    } catch { setSuggestError('Network error.'); }
    finally { setAddingSuggestedKey(null); }
  };

  const handleReject = (text: string) => {
    const key = normKey(text);
    setSuggestions(prev => prev ? prev.filter(s => normKey(s.text) !== key) : null);
    setSelectedSuggestionKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const handleAcceptSelected = async () => {
    if (!suggestions) return;
    const selected = suggestions.filter(s => selectedSuggestionKeys.has(normKey(s.text)));
    if (selected.length === 0) return;
    setAddingAllSuggested(true); setSuggestError(null);
    try {
      for (const s of selected) {
        const res = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, promptText: s.text, category: s.category }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setSuggestError(typeof err.error === 'string' ? err.error : 'Failed to add a prompt.');
          break;
        }
      }
      const accepted = new Set(selectedSuggestionKeys);
      setSuggestions(prev => prev ? prev.filter(s => !accepted.has(normKey(s.text))) : null);
      setSelectedSuggestionKeys(new Set());
      invalidateCache(domain); await fetchData();
    } catch { setSuggestError('Network error.'); invalidateCache(domain); await fetchData(); }
    finally { setAddingAllSuggested(false); }
  };

  const handleRejectSelected = () => {
    const rejected = new Set(selectedSuggestionKeys);
    setSuggestions(prev => prev ? prev.filter(s => !rejected.has(normKey(s.text))) : null);
    setSelectedSuggestionKeys(new Set());
  };

  /* ── Bulk actions for Active / Inactive tabs ───────────── */

  const [bulkProcessing, setBulkProcessing] = useState(false);

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/prompts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        });
      }
      setSelectedIds(new Set());
      invalidateCache(domain);
      await fetchData();
    } catch { /* silently fail */ }
    finally { setBulkProcessing(false); }
  };

  const handleBulkReactivate = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/prompts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        });
      }
      setSelectedIds(new Set());
      invalidateCache(domain);
      await fetchData();
    } catch { /* silently fail */ }
    finally { setBulkProcessing(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      }
      setSelectedIds(new Set());
      invalidateCache(domain);
      await fetchData();
    } catch { /* silently fail */ }
    finally { setBulkProcessing(false); }
  };

  /* ── Derived data ────────────────────────────────────────── */

  const prompts = data?.prompts ?? [];
  const results = data?.results ?? [];
  const activePrompts = prompts.filter(p => p.active);
  const inactivePrompts = prompts.filter(p => !p.active);
  const atLimit = maxPrompts > 0 && prompts.length >= maxPrompts;

  const filterList = (list: PromptRow[]) => {
    let out = list;
    if (catFilter !== 'all') out = out.filter(p => p.category === catFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(p => p.promptText.toLowerCase().includes(q));
    }
    return out;
  };
  const filteredActive = filterList(activePrompts);
  const filteredInactive = filterList(inactivePrompts);

  const statsFor = (id: string) => {
    const pr = results.filter(r => r.promptId === id);
    const mentioned = pr.filter(r => r.mentioned).length;
    const rate = pr.length > 0 ? Math.round((mentioned / pr.length) * 100) : null;
    const engines = new Map<AIEngine, boolean>();
    for (const r of pr) {
      const prev = engines.get(r.engine);
      if (prev === undefined || r.mentioned) engines.set(r.engine, r.mentioned);
    }
    // Average position → sentiment
    const positions = pr.filter(r => r.position !== null).map(r => r.position as number);
    const avgPosition = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
    const sentiment: 'positive' | 'neutral' | 'negative' | null =
      avgPosition !== null ? (avgPosition <= 3 ? 'positive' : avgPosition <= 7 ? 'neutral' : 'negative') : null;
    // Last tested date
    const dates = pr.map(r => new Date(r.testedAt).getTime()).filter(d => !isNaN(d));
    const lastRun = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    return { total: pr.length, mentioned, rate, engines, sentiment, lastRun };
  };

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const usagePct = maxPrompts > 0 ? Math.min(Math.round((prompts.length / maxPrompts) * 100), 100) : 0;
  const nearLimit = usagePct >= 80;

  /* ── Selection helpers ───────────────────────────────────── */

  const toggleId = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAllIds = (ids: string[]) => {
    const all = ids.every(id => selectedIds.has(id));
    setSelectedIds(all ? new Set() : new Set(ids));
  };
  const toggleSuggKey = (key: string) => {
    setSelectedSuggestionKeys(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };
  const toggleAllSuggestions = () => {
    if (!suggestions) return;
    const allKeys = suggestions.map(s => normKey(s.text));
    const all = allKeys.every(k => selectedSuggestionKeys.has(k));
    setSelectedSuggestionKeys(all ? new Set() : new Set(allKeys));
  };

  /* ── Loading state ───────────────────────────────────────── */

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0ea5e9]/30 border-t-[#0ea5e9]" />
          <p className="text-xs text-zinc-500">Loading prompts...</p>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */

  const currentList = tab === 'active' ? filteredActive : filteredInactive;
  const currentIds = currentList.map(p => p.id);

  /* Shared column header with sort arrow */
  const ColHeader = ({ children, className: cls }: { children: React.ReactNode; className?: string }) => (
    <th className={cn('px-4 py-4 text-left text-[12px] font-medium uppercase tracking-wide text-zinc-500', cls)}>
      <span className="inline-flex items-center gap-1.5">
        <ArrowUpDown className="h-3 w-3 text-zinc-600" />
        {children}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] max-w-[400px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tab === 'suggestions' ? 'Search suggestions...' : 'Search prompts...'}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:border-[#0ea5e9]/40 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/20"
          />
        </div>
        <div className="relative">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value as PromptCategory)}
            className="appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-9 text-[14px] text-zinc-300 focus:border-[#0ea5e9]/40 focus:outline-none"
          >
            {PROMPT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        </div>
        <div className="flex-1" />
        {tab === 'active' && (
          <>
            <button
              type="button"
              onClick={() => goToTab('suggestions')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 px-4 py-3 text-[13px] font-semibold text-[#7dd3fc] transition-colors hover:bg-[#0ea5e9]/16"
            >
              <Sparkles className="h-4 w-4" />
              AI Suggest
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              disabled={atLimit}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-45"
            >
              <Plus className="h-4 w-4" />
              Add Prompt
            </button>
          </>
        )}
        {tab === 'suggestions' && (
          <button
            type="button"
            onClick={() => setShowSuggestModal(true)}
            disabled={suggestLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-semibold text-[#1c1c1e] transition-opacity hover:opacity-90 disabled:opacity-45"
          >
            <Sparkles className="h-4 w-4" />
            {suggestLoading ? 'Generating...' : 'Suggest More'}
          </button>
        )}
      </div>

      {/* ── Usage bar ───────────────────────────────────────── */}
      {maxPrompts > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-3.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className={cn('font-medium', atLimit ? 'text-red-400' : nearLimit ? 'text-amber-400' : 'text-zinc-400')}>
              {prompts.length} / {maxPrompts} prompts used
            </span>
            {atLimit && (
              <button type="button" onClick={onOpenUnlock} className="inline-flex items-center gap-1.5 font-medium text-red-400 hover:text-red-300">
                Limit reached — upgrade <Sparkles className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn('h-full rounded-full transition-all duration-500', atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-[#0ea5e9]')}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <div>

        {/* ════════════════ ACTIVE TAB ════════════════ */}
        {tab === 'active' && (
          <>
            {/* Section header */}
            <div className="flex items-center gap-2.5 pb-4">
              <h2 className="text-[20px] font-bold text-white">Active Prompts</h2>
              <InfoTooltip text="Prompts currently being tracked across AI engines. Each row shows which engines mention your brand when users ask this question." className="align-middle" />
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && tab === 'active' && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#0ea5e9]/20 bg-gradient-to-r from-[#0ea5e9]/[0.06] to-[#0ea5e9]/[0.02] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-[#0ea5e9]/20 px-2 text-[12px] font-bold tabular-nums text-[#7dd3fc]">{selectedIds.size}</span>
                  <span className="text-[14px] font-medium text-zinc-200">
                    {selectedIds.size === 1 ? 'prompt selected' : 'prompts selected'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Clear
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleBulkDeactivate}
                  disabled={bulkProcessing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-2.5 text-[13px] font-medium text-amber-400 transition-all hover:border-amber-400/40 hover:bg-amber-400/[0.12] disabled:opacity-40"
                >
                  {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ToggleRight className="h-4 w-4" />}
                  Deactivate
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkProcessing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-4 py-2.5 text-[13px] font-medium text-red-400 transition-all hover:border-red-400/40 hover:bg-red-400/[0.12] disabled:opacity-40"
                >
                  {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            )}

            {/* Suggestion banner */}
            {activePrompts.length > 0 && selectedIds.size === 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#0ea5e9]/10 bg-[#0ea5e9]/[0.03] px-5 py-4">
                <Lightbulb className="h-4.5 w-4.5 shrink-0 text-[#ffbb00]/70" />
                <span className="text-[14px] text-zinc-400">
                  <span className="font-medium text-zinc-300">Looking for more prompts?</span>{' '}
                  Explore AI-generated suggestions tailored to your brand.
                </span>
              </div>
            )}

            {/* Background-run notice */}
            {backgroundRunQueued && results.length === 0 && (
              <div className="py-3">
                <p className="text-[13px] text-[#7dd3fc]">
                  Running initial prompt tests across your enabled AI engines. Results will appear automatically.
                </p>
              </div>
            )}

            {/* Active prompts table */}
            {filteredActive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-[14px] text-zinc-500">
                  {searchQuery ? 'No prompts match your search.' : 'No active prompts yet. Add one to start tracking.'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-y border-white/[0.06]">
                    <th className="w-[48px] py-4 pl-5 pr-1 text-center">
                      <input
                        type="checkbox"
                        checked={currentIds.length > 0 && currentIds.every(id => selectedIds.has(id))}
                        onChange={() => toggleAllIds(currentIds)}
                        className="h-4 w-4 cursor-pointer rounded border-white/20 accent-[#0ea5e9]"
                      />
                    </th>
                    <ColHeader>Prompt</ColHeader>
                    <ColHeader>Topic</ColHeader>
                    <ColHeader className="text-center">Visibility</ColHeader>
                    <ColHeader className="text-center">Sentiment</ColHeader>
                    <ColHeader className="text-center">Competitors</ColHeader>
                    <ColHeader>Last Run</ColHeader>
                    <th className="w-[44px] py-4 pr-5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.map(p => {
                    const s = statsFor(p.id);
                    const isSelected = selectedIds.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          'group border-b transition-colors',
                          isSelected
                            ? 'border-[#0ea5e9]/10 bg-[#0ea5e9]/[0.04]'
                            : 'border-white/[0.05] hover:bg-white/[0.02]',
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-5 pl-5 pr-1 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleId(p.id)}
                            className="h-4 w-4 cursor-pointer rounded border-white/20 accent-[#0ea5e9]"
                          />
                        </td>

                        {/* Prompt */}
                        <td className="py-5 pl-4 pr-6 align-middle">
                          {editingId === p.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(p.id); if (e.key === 'Escape') { setEditingId(null); } }}
                                autoFocus
                                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#1b1b1c] px-3 py-2 text-[14px] text-zinc-100 focus:outline-none"
                              />
                              <button type="button" onClick={() => handleSaveEdit(p.id)} className="shrink-0 text-[13px] font-medium text-[#25c972] hover:underline">Save</button>
                              <button type="button" onClick={() => setEditingId(null)} className="shrink-0 text-[13px] font-medium text-zinc-500 hover:underline">Cancel</button>
                            </div>
                          ) : (
                            <p className="text-[14px] font-medium leading-relaxed text-zinc-100">{p.promptText}</p>
                          )}
                        </td>

                        {/* Topic */}
                        <td className="whitespace-nowrap py-5 px-4 align-middle">
                          <span className="text-[14px] text-zinc-400">{p.category.charAt(0).toUpperCase() + p.category.slice(1)}</span>
                        </td>

                        {/* Visibility */}
                        <td className="whitespace-nowrap py-5 px-4 text-center align-middle">
                          {s.rate !== null ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[16px] font-bold tabular-nums text-zinc-100">{s.rate}%</span>
                              <span className={cn(
                                'mt-0.5 inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums',
                                s.rate >= 60 ? 'text-[#25c972]' : s.rate >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]',
                              )}>
                                {s.rate >= 60 ? <TrendingUp className="h-3.5 w-3.5" /> : s.rate >= 30 ? <Minus className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                {s.rate >= 60 ? 'High' : s.rate >= 30 ? 'Med' : 'Low'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-zinc-600">--</span>
                          )}
                        </td>

                        {/* Sentiment */}
                        <td className="whitespace-nowrap py-5 px-4 text-center align-middle">
                          {s.sentiment ? (
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold tabular-nums',
                              s.sentiment === 'positive'
                                ? 'bg-[#25c972]/15 text-[#25c972]'
                                : s.sentiment === 'neutral'
                                  ? 'bg-[#ffbb00]/15 text-[#ffbb00]'
                                  : 'bg-[#ff5252]/15 text-[#ff5252]',
                            )}>
                              {s.rate ?? 0}%
                              {s.sentiment === 'positive' ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : s.sentiment === 'neutral' ? (
                                <Minus className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          ) : (
                            <span className="text-[13px] text-zinc-600">--</span>
                          )}
                        </td>

                        {/* Competitors (engine icons) */}
                        <td className="py-5 px-4 align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            {AI_ENGINES.map(engine => {
                              const mentioned = s.engines.get(engine);
                              if (mentioned === undefined) return null;
                              return (
                                <span
                                  key={engine}
                                  className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full transition-opacity',
                                    mentioned ? 'bg-white/[0.06]' : 'opacity-20',
                                  )}
                                  title={`${getAIEngineLabel(engine)}: ${mentioned ? 'Mentioned' : 'Not mentioned'}`}
                                  style={{ color: mentioned ? ENGINE_COLORS[engine] : undefined }}
                                >
                                  <EngineIcon engine={engine} className="size-4.5" />
                                </span>
                              );
                            })}
                            {s.total === 0 && <span className="text-[12px] text-zinc-600">--</span>}
                          </div>
                        </td>

                        {/* Last Run */}
                        <td className="whitespace-nowrap py-5 px-4 align-middle">
                          {s.lastRun ? (
                            <span className="text-[13px] tabular-nums text-zinc-500">{fmtDate(s.lastRun)}</span>
                          ) : (
                            <span className="text-[13px] text-zinc-600">--</span>
                          )}
                        </td>

                        {/* Row action menu */}
                        <td className="py-5 pr-5 text-right align-middle">
                          {selectedIds.size === 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  const menu = (e.currentTarget.nextElementSibling as HTMLElement);
                                  menu.classList.toggle('hidden');
                                  const close = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) { menu.classList.add('hidden'); document.removeEventListener('mousedown', close); } };
                                  document.addEventListener('mousedown', close);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all hover:bg-white/[0.06] hover:text-zinc-300 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4.5 w-4.5" />
                              </button>
                              <div className="hidden absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] py-1.5 shadow-xl shadow-black/40">
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(p.id); setEditText(p.promptText); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-zinc-300 transition-colors hover:bg-white/[0.05]"
                                >
                                  <Pencil className="h-4 w-4 text-zinc-500" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggle(p.id, p.active)}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-amber-400 transition-colors hover:bg-white/[0.05]"
                                >
                                  <ToggleRight className="h-4 w-4" />
                                  Deactivate
                                </button>
                                <div className="my-1 border-t border-white/[0.06]" />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id)}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-red-400 transition-colors hover:bg-white/[0.05]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Engine breakdown footer */}
            {results.length > 0 && (
              <div className="mt-6 border-t border-white/[0.06] pt-6">
                <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Mention rate by engine</p>
                <div className="flex flex-wrap gap-3">
                  {AI_ENGINES.map(engine => {
                    const er = results.filter(r => r.engine === engine);
                    if (er.length === 0) return null;
                    const m = er.filter(r => r.mentioned).length;
                    const rate = Math.round((m / er.length) * 100);
                    return (
                      <div key={engine} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                        <EngineIcon engine={engine} className="size-4.5" style={{ color: ENGINE_COLORS[engine] ?? '#71717a' }} />
                        <span className="text-[13px] text-zinc-400">{getAIEngineLabel(engine)}</span>
                        <span className={cn('text-[14px] font-bold tabular-nums', rate >= 60 ? 'text-[#25c972]' : rate >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]')}>{rate}%</span>
                        <span className="text-[11px] text-zinc-600">{er.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════ INACTIVE TAB ════════════════ */}
        {tab === 'inactive' && (
          <>
            <div className="flex items-center gap-2.5 pb-4">
              <h2 className="text-[20px] font-bold text-white">Inactive Prompts</h2>
              <InfoTooltip text="Paused prompts that are no longer being tracked. Reactivate them to resume monitoring without losing historical data." className="align-middle" />
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#0ea5e9]/20 bg-gradient-to-r from-[#0ea5e9]/[0.06] to-[#0ea5e9]/[0.02] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-[#0ea5e9]/20 px-2 text-[12px] font-bold tabular-nums text-[#7dd3fc]">{selectedIds.size}</span>
                  <span className="text-[14px] font-medium text-zinc-200">
                    {selectedIds.size === 1 ? 'prompt selected' : 'prompts selected'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Clear
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleBulkReactivate}
                  disabled={bulkProcessing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#25c972]/25 bg-[#25c972]/[0.06] px-4 py-2.5 text-[13px] font-medium text-[#25c972] transition-all hover:border-[#25c972]/40 hover:bg-[#25c972]/[0.12] disabled:opacity-40"
                >
                  {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ToggleLeft className="h-4 w-4" />}
                  Reactivate
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkProcessing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-4 py-2.5 text-[13px] font-medium text-red-400 transition-all hover:border-red-400/40 hover:bg-red-400/[0.12] disabled:opacity-40"
                >
                  {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            )}

            {filteredInactive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-[14px] text-zinc-500">
                  {searchQuery ? 'No prompts match your search.' : 'No inactive prompts. Deactivate prompts from the Active tab to pause tracking without losing history.'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-y border-white/[0.06]">
                    <th className="w-[48px] py-4 pl-5 pr-1 text-center">
                      <input
                        type="checkbox"
                        checked={currentIds.length > 0 && currentIds.every(id => selectedIds.has(id))}
                        onChange={() => toggleAllIds(currentIds)}
                        className="h-4 w-4 cursor-pointer rounded border-white/20 accent-[#0ea5e9]"
                      />
                    </th>
                    <ColHeader>Prompt</ColHeader>
                    <ColHeader>Topic</ColHeader>
                    <ColHeader className="text-center">Engines</ColHeader>
                    <th className="w-[44px] py-4 pr-5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredInactive.map(p => {
                    const s = statsFor(p.id);
                    const isSelected = selectedIds.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          'group border-b transition-colors',
                          isSelected
                            ? 'border-[#0ea5e9]/10 bg-[#0ea5e9]/[0.04]'
                            : 'border-white/[0.05] hover:bg-white/[0.02]',
                        )}
                      >
                        <td className="py-5 pl-5 pr-1 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleId(p.id)}
                            className="h-4 w-4 cursor-pointer rounded border-white/20 accent-[#0ea5e9]"
                          />
                        </td>
                        <td className="py-5 pl-4 pr-6 align-middle">
                          <p className="text-[14px] leading-relaxed text-zinc-500">{p.promptText}</p>
                        </td>
                        <td className="whitespace-nowrap py-5 px-4 align-middle">
                          <span className="text-[14px] text-zinc-500">{p.category.charAt(0).toUpperCase() + p.category.slice(1)}</span>
                        </td>
                        <td className="py-5 px-4 align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            {AI_ENGINES.map(engine => {
                              const mentioned = s.engines.get(engine);
                              if (mentioned === undefined) return null;
                              return (
                                <span key={engine} className="flex h-8 w-8 items-center justify-center rounded-full opacity-20" title={`${getAIEngineLabel(engine)}`}>
                                  <EngineIcon engine={engine} className="size-4.5" />
                                </span>
                              );
                            })}
                            {s.total === 0 && <span className="text-[12px] text-zinc-600">--</span>}
                          </div>
                        </td>
                        <td className="py-5 pr-5 text-right align-middle">
                          {selectedIds.size === 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  const menu = (e.currentTarget.nextElementSibling as HTMLElement);
                                  menu.classList.toggle('hidden');
                                  const close = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) { menu.classList.add('hidden'); document.removeEventListener('mousedown', close); } };
                                  document.addEventListener('mousedown', close);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all hover:bg-white/[0.06] hover:text-zinc-300 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4.5 w-4.5" />
                              </button>
                              <div className="hidden absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] py-1.5 shadow-xl shadow-black/40">
                                <button
                                  type="button"
                                  onClick={() => handleToggle(p.id, p.active)}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-[#25c972] transition-colors hover:bg-white/[0.05]"
                                >
                                  <ToggleLeft className="h-4 w-4" />
                                  Reactivate
                                </button>
                                <div className="my-1 border-t border-white/[0.06]" />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id)}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-red-400 transition-colors hover:bg-white/[0.05]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ════════════════ SUGGESTIONS TAB ════════════════ */}
        {tab === 'suggestions' && (
          <>
            {/* Section header + Export */}
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[20px] font-bold text-white">Prompt Suggestions</h2>
                <InfoTooltip text="AI-generated prompt suggestions based on your domain and latest scan results. Accept prompts to start tracking them across AI engines." className="align-middle" />
              </div>
              {suggestions && suggestions.length > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-[14px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              )}
            </div>

            {suggestError && (
              <div className="py-2">
                <p className="text-[13px] text-red-400">{suggestError}</p>
              </div>
            )}

            {atLimit && (
              <div className="py-2">
                <p className="text-[13px] text-amber-400/90">Prompt limit reached — remove a prompt or upgrade to accept suggestions.</p>
              </div>
            )}

            {/* Bulk action bar */}
            {selectedSuggestionKeys.size > 0 && suggestions && suggestions.length > 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#0ea5e9]/20 bg-gradient-to-r from-[#0ea5e9]/[0.06] to-[#0ea5e9]/[0.02] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-[#0ea5e9]/20 px-2 text-[12px] font-bold tabular-nums text-[#7dd3fc]">{selectedSuggestionKeys.size}</span>
                  <span className="text-[14px] font-medium text-zinc-200">
                    {selectedSuggestionKeys.size === 1 ? 'suggestion selected' : 'suggestions selected'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSuggestionKeys(new Set())}
                  className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Clear
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleAcceptSelected}
                  disabled={atLimit || addingAllSuggested}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#25c972]/25 bg-[#25c972]/[0.06] px-4 py-2.5 text-[13px] font-medium text-[#25c972] transition-all hover:border-[#25c972]/40 hover:bg-[#25c972]/[0.12] disabled:opacity-40"
                >
                  {addingAllSuggested ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Accept
                </button>
                <button
                  type="button"
                  onClick={handleRejectSelected}
                  disabled={addingAllSuggested}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-4 py-2.5 text-[13px] font-medium text-red-400 transition-all hover:border-red-400/40 hover:bg-red-400/[0.12] disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}

            {/* Content */}
            {suggestLoading ? (
              <div className="flex items-center justify-center py-28">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-11 w-11 animate-spin rounded-full border-2 border-[#0ea5e9]/20 border-t-[#0ea5e9]" />
                    <Sparkles className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#0ea5e9]/60" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-medium text-zinc-300">Generating suggestions...</p>
                    <p className="mt-1.5 text-[13px] text-zinc-500">Analyzing your brand and domain for optimal prompts</p>
                  </div>
                </div>
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-white/[0.06]">
                      <th className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={suggestions.length > 0 && suggestions.every(s => selectedSuggestionKeys.has(normKey(s.text)))}
                          onChange={toggleAllSuggestions}
                          className="h-4 w-4 cursor-pointer rounded border-white/20 accent-[#0ea5e9]"
                        />
                      </th>
                      <ColHeader>Prompt</ColHeader>
                      <ColHeader>Topic</ColHeader>
                      <th className="w-56 px-4 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map(s => {
                      const key = normKey(s.text);
                      const busy = addingSuggestedKey === key || addingAllSuggested;
                      const isSuggSelected = selectedSuggestionKeys.has(key);
                      return (
                        <tr
                          key={key}
                          className={cn(
                            'border-b transition-colors',
                            isSuggSelected
                              ? 'border-[#0ea5e9]/10 bg-[#0ea5e9]/[0.04]'
                              : 'border-white/[0.05] hover:bg-white/[0.015]',
                          )}
                        >
                          <td className="w-12 px-4 py-5 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isSuggSelected}
                              onChange={() => toggleSuggKey(key)}
                              className="h-4 w-4 cursor-pointer rounded border-white/20 accent-[#0ea5e9]"
                            />
                          </td>
                          <td className="max-w-[480px] px-4 py-5 align-middle">
                            <p className="text-[14px] font-medium leading-snug text-zinc-100">{s.text}</p>
                          </td>
                          <td className="px-4 py-5 align-middle">
                            <span className="text-[14px] text-zinc-400">
                              {s.category.charAt(0).toUpperCase() + s.category.slice(1)}
                            </span>
                          </td>
                          <td className="w-56 px-4 py-5 text-right align-middle">
                            <div className="inline-flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleAccept(s.text, s.category)}
                                disabled={atLimit || busy}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-40',
                                  'border-[#25c972]/30 text-[#25c972] hover:border-[#25c972]/50 hover:bg-[#25c972]/10',
                                )}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(s.text)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-4 py-2 text-[13px] font-medium text-red-400 transition-all hover:border-red-400/50 hover:bg-red-400/10 disabled:opacity-40"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Source attribution */}
                {suggestSource && (
                  <div className="mt-4 border-t border-white/[0.04] pt-3">
                    <p className="text-[12px] text-zinc-600">
                      Suggestions generated via {suggestSource === 'llm' ? 'AI analysis' : 'heuristic analysis'} of your domain.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-28">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#0ea5e9]/15 bg-[#0ea5e9]/[0.06]">
                    <Sparkles className="h-7 w-7 text-[#0ea5e9]/70" />
                  </div>
                  <h3 className="text-[18px] font-semibold text-white">Generate prompt suggestions</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-zinc-400">
                    Our AI analyzes your latest scan to suggest prompts that reflect how real users search for businesses like yours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSuggestModal(true)}
                    disabled={suggestLoading}
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-[14px] font-semibold text-[#1c1c1e] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Suggestions
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Coming-soon teaser ─────────────────────────────── */}
      <PromptVolumeTeaser />

      {/* ── Modals ────────────────────────────────────────── */}
      <AddPromptModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPrompt}
        disabled={atLimit}
      />
      <SuggestModal
        open={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onGenerate={(cat) => handleSuggest(cat)}
      />
    </div>
  );
}
