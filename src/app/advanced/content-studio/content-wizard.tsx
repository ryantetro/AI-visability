'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  Lightbulb,
  Link2,
  List,
  Loader2,
  MessageSquare,
  Newspaper,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Type,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonitoredPrompt } from '@/types/services';

/* ── Types ────────────────────────────────────────────────────────────── */

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  status: string;
  topic: string | null;
  audience_id: string | null;
  tone: string;
  length: string;
  perspective: string;
  sections: unknown[];
  cta_text: string | null;
  additional_instructions: string[];
  brief_markdown: string | null;
  article_markdown: string | null;
  workflow_progress: { step: number; progress: number; currentTask: string } | null;
  created_at: string;
  updated_at: string;
}

/* ── Content Type Config ──────────────────────────────────────────────── */

interface ContentTypeOption {
  id: string;
  label: string;
  description: string;
  category: 'informational' | 'comparative' | 'social' | 'transactional';
  icon: typeof FileText;
  isNew?: boolean;
  comingSoon?: boolean;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: 'blog_post',     label: 'Blog Post',      description: 'Long-form article for your blog',              category: 'informational', icon: FileText, isNew: true },
  { id: 'listicle',      label: 'Listicle',        description: 'Numbered list-style article',                  category: 'informational', icon: List },
  { id: 'how_to_guide',  label: 'How-To Guide',    description: 'Step-by-step tutorial',                        category: 'informational', icon: Zap },
  { id: 'case_study',    label: 'Case Study',      description: 'Success story with data',                      category: 'informational', icon: Star },
  { id: 'comparison',    label: 'Comparison',       description: 'Compare products or services',                 category: 'comparative',   icon: ArrowRight },
  { id: 'review',        label: 'Review',           description: 'Product or service review',                    category: 'comparative',   icon: MessageSquare },
  { id: 'social_post',   label: 'Social Post',      description: 'Short social media content',                   category: 'social',        icon: Newspaper },
  { id: 'product_page',  label: 'Product Page',     description: 'Product description page',                     category: 'transactional', icon: ShoppingBag },
  { id: 'landing_page',  label: 'Landing Page',     description: 'Conversion-focused landing page',              category: 'transactional', icon: Sparkles, comingSoon: true },
];

const CATEGORY_LABELS: Record<string, string> = {
  informational: 'Informational',
  comparative: 'Comparative',
  social: 'Social',
  transactional: 'Transactional',
};

/* ── Section Config ────────────────────────────────────────────────────── */

const ARTICLE_SECTIONS = [
  { id: 'key_takeaways', label: 'Key Takeaways', description: 'Summary box at the top' },
  { id: 'faq',           label: 'FAQ Section',    description: 'Frequently asked questions' },
  { id: 'cta',           label: 'Call to Action',  description: 'Closing CTA block' },
];

/* ── Wizard Steps ──────────────────────────────────────────────────────── */

const STEPS = [
  { id: 1, label: 'Topic & Prompts',       short: 'Topic' },
  { id: 2, label: 'Audience Settings',     short: 'Audience' },
  { id: 3, label: 'Additional Context',    short: 'Context' },
  { id: 4, label: 'Review & Generate',     short: 'Review' },
];

/* ── Main Component ──────────────────────────────────────────────────── */

export function ContentWizard({
  domain,
  onComplete,
  onCancel,
}: {
  domain: string;
  onComplete: (item: ContentItem) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdItem, setCreatedItem] = useState<ContentItem | null>(null);

  // Step 1
  const [contentType, setContentType] = useState('blog_post');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [showTitleSelection, setShowTitleSelection] = useState(false);

  // Step 1 — Prompt selection
  const [prompts, setPrompts] = useState<MonitoredPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string | null>(null);

  // Step 2
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [audienceText, setAudienceText] = useState('');

  // Step 3
  const [perspective, setPerspective] = useState('second');
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set(['key_takeaways', 'cta']));
  const [ctaText, setCtaText] = useState('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [newInstruction, setNewInstruction] = useState('');

  // Step 4
  const [title, setTitle] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [titleSuggestLoading, setTitleSuggestLoading] = useState(false);

  /* ── AI title suggestion ──── */
  const handleSuggestTitles = async () => {
    if (titleSuggestLoading) return;
    setTitleSuggestLoading(true);
    try {
      const res = await fetch('/api/content-studio/suggest-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), content_type: contentType, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitleSuggestions(data.titles ?? []);
      }
    } catch { /* ignore */ }
    setTitleSuggestLoading(false);
  };

  /* ── Fetch monitored prompts ──── */
  useEffect(() => {
    let active = true;
    async function fetchPrompts() {
      try {
        const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setPrompts((data.prompts as MonitoredPrompt[]).filter((p) => p.active));
          }
        }
      } catch { /* ignore */ }
      if (active) setPromptsLoading(false);
    }
    void fetchPrompts();
    return () => { active = false; };
  }, [domain]);

  /* ── Prompt selection helpers ──── */
  const togglePrompt = (id: string) => {
    setSelectedPromptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedPrompts = prompts.filter((p) => selectedPromptIds.has(p.id));

  // Auto-suggest topic when prompts are selected and topic is empty
  useEffect(() => {
    if (selectedPromptIds.size > 0 && topic.trim() === '') {
      const first = prompts.find((p) => selectedPromptIds.has(p.id));
      if (first) setTopic(first.promptText);
    }
  }, [selectedPromptIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPrompts = promptCategoryFilter
    ? prompts.filter((p) => p.category === promptCategoryFilter)
    : prompts;

  const promptCategories = [...new Set(prompts.map((p) => p.category))];

  /* ── Navigation ──── */
  const canProceed = () => {
    switch (step) {
      case 1: return !!contentType && (topic.trim().length > 0 || selectedPromptIds.size > 0);
      case 2: return true;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4 && canProceed()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  /* (Generating animation removed — brief-viewer handles real-time progress) */

  /* ── Submit ──── */
  const handleSubmit = async () => {
    if (!canProceed() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      // Create the content item
      const res = await fetch('/api/content-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          title: title.trim(),
          content_type: contentType,
          topic: topic.trim(),
          tone,
          length,
          perspective,
          sections: ARTICLE_SECTIONS.map((s) => ({
            id: s.id,
            label: s.label,
            enabled: enabledSections.has(s.id),
          })),
          cta_text: ctaText.trim() || null,
          additional_instructions: instructions.filter(Boolean),
          selected_prompts: selectedPromptIds.size > 0 ? [...selectedPromptIds] : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create content.' }));
        setError(data.error || `Request failed (${res.status})`);
        setSubmitting(false);
        return;
      }

      const item = await res.json();
      setCreatedItem(item);

      setSubmitting(false);

      // Trigger generation in background
      const genRes = await fetch(`/api/content-studio/${item.id}/generate`, { method: 'POST' });

      if (!genRes.ok) {
        const genData = await genRes.json().catch(() => ({ error: 'Generation failed.' }));
        setError(genData.error || 'Brief generation failed. You can try again from the content list.');
        return;
      }

      // Go straight to the brief-viewer with the generating status —
      // no intermediate animation. The brief-viewer shows real-time progress.
      onComplete({ ...item, status: 'brief_generating' });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    }
  };

  /* ── Filtered content types ──── */
  const filteredTypes = categoryFilter
    ? CONTENT_TYPES.filter((t) => t.category === categoryFilter)
    : CONTENT_TYPES;

  /* ── Sections toggle ──── */
  const toggleSection = (id: string) => {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Add instruction ──── */
  const addInstruction = () => {
    if (newInstruction.trim()) {
      setInstructions((prev) => [...prev, newInstruction.trim()]);
      setNewInstruction('');
    }
  };

  const progressPct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <div>
      {/* ── Back link ──── */}
      <div className="mb-6 flex items-center justify-between">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 text-[14px] text-zinc-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Contents
        </button>
        {/* Mobile step pills */}
        <div className="flex items-center gap-1.5 md:hidden">
          {STEPS.map((s) => (
            <div key={s.id} className={cn('h-1.5 w-6 rounded-full transition-colors', s.id < step ? 'bg-[#25c972]' : s.id === step ? 'bg-[var(--color-primary-600,#2455dc)]' : 'bg-white/[0.08]')} />
          ))}
        </div>
      </div>

      <div className="flex gap-8">
        {/* ── Sidebar ──── */}
        <div className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-6">
            <p className="text-[16px] font-bold text-white">Content Wizard</p>
            <p className="mt-0.5 text-[13px] text-zinc-500">Step {step} of {STEPS.length}</p>

            <nav className="mt-8 space-y-1">
              {STEPS.map((s) => {
                const isActive = s.id === step;
                const isCompleted = s.id < step;
                const isFuture = s.id > step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { if (isCompleted) setStep(s.id); }}
                    disabled={isFuture}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors', isActive && 'bg-white/[0.04] text-white', isCompleted && 'text-zinc-300 hover:bg-white/[0.03]', isFuture && 'text-zinc-600 cursor-default')}
                  >
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                      isActive && 'bg-[var(--color-primary-600,#2455dc)] text-white',
                      isCompleted && 'bg-transparent text-[#25c972]',
                      isFuture && 'bg-transparent text-zinc-600',
                    )}>
                      {isCompleted ? <Check className="h-4.5 w-4.5" /> : s.id}
                    </div>
                    <div className="min-w-0">
                      <span className={cn('block truncate', isActive && 'font-semibold')}>{s.label}</span>
                      {isActive && <span className="text-[11px] text-zinc-500">Current step</span>}
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Progress */}
            <div className="mt-10">
              <div className="flex items-center justify-between text-[12px] text-zinc-500">
                <span>Progress</span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[var(--color-primary-600,#2455dc)] transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ──── */}
        <div className="min-w-0 flex-1">

            {/* ── Step 1: Topic & Prompts ──── */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Topic input */}
                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-zinc-200">Topic</label>
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., AI visibility optimization for SaaS companies" className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-[14px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none" />
                </div>

                {/* Two-column: Content Types | Prompts */}
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Left — Content Types */}
                  <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-zinc-400" />
                        <span className="text-[14px] font-semibold text-zinc-200">Content Types</span>
                      </div>
                      <span className="text-[13px] tabular-nums text-zinc-500">{CONTENT_TYPES.filter((t) => !t.comingSoon).length}</span>
                    </div>
                    <div className="border-t border-white/[0.06] px-4 py-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                        <input type="text" value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} placeholder="Search types..." className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-9 pr-3 text-[13px] text-zinc-300 placeholder:text-zinc-600 focus:border-white/[0.12] focus:outline-none" />
                      </div>
                    </div>
                    <div className="max-h-[380px] divide-y divide-white/[0.04] overflow-y-auto">
                      {CONTENT_TYPES.filter((t) => !t.comingSoon && t.label.toLowerCase().includes(typeSearch.toLowerCase())).map((type) => {
                        const sel = contentType === type.id;
                        return (
                          <button key={type.id} type="button" onClick={() => setContentType(type.id)} className={cn('flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors', sel ? 'bg-[var(--color-primary-600,#2455dc)]/8' : 'hover:bg-white/[0.02]')}>
                            <span className={cn('text-[14px]', sel ? 'font-semibold text-[var(--color-primary-600,#2455dc)]' : 'text-zinc-300')}>{type.label}</span>
                            <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', sel ? 'border-[#25c972] bg-[#25c972]' : 'border-white/[0.15]')}>
                              {sel && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right — Prompts */}
                  <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center justify-between px-5 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Star className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span className="truncate text-[14px] font-semibold text-zinc-200">Prompts{topic ? ` \u2014 ${topic.length > 25 ? topic.slice(0, 22) + '\u2026' : topic}` : ''}</span>
                      </div>
                      <span className="shrink-0 text-[13px] tabular-nums text-zinc-500">{selectedPromptIds.size}/{prompts.length}</span>
                    </div>
                    <div className="border-t border-white/[0.06] px-4 py-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                        <input type="text" value={promptSearch} onChange={(e) => setPromptSearch(e.target.value)} placeholder="Search prompts..." className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-9 pr-3 text-[13px] text-zinc-300 placeholder:text-zinc-600 focus:border-white/[0.12] focus:outline-none" />
                      </div>
                    </div>
                    <div className="max-h-[380px] divide-y divide-white/[0.04] overflow-y-auto">
                      {promptsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /><span className="text-[13px] text-zinc-500">Loading...</span></div>
                      ) : prompts.length === 0 ? (
                        <p className="px-5 py-10 text-center text-[13px] text-zinc-600">No monitored prompts yet.</p>
                      ) : prompts.filter((p) => p.promptText.toLowerCase().includes(promptSearch.toLowerCase())).map((prompt) => {
                        const sel = selectedPromptIds.has(prompt.id);
                        return (
                          <button key={prompt.id} type="button" onClick={() => togglePrompt(prompt.id)} className={cn('flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors', sel ? 'bg-[var(--color-primary-600,#2455dc)]/8' : 'hover:bg-white/[0.02]')}>
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--color-primary-600,#2455dc)]/20"><FileText className="h-3.5 w-3.5 text-[var(--color-primary-600,#2455dc)]" /></div>
                              <span className={cn('truncate text-[14px]', sel ? 'font-medium text-white' : 'text-zinc-300')}>{prompt.promptText}</span>
                            </div>
                            <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', sel ? 'border-[var(--color-primary-600,#2455dc)] bg-[var(--color-primary-600,#2455dc)]' : 'border-white/[0.15]')}>
                              {sel && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Audience Settings ──── */}
            {step === 2 && (
              <div className="mx-auto flex max-w-xl flex-col items-center py-10">
                <h2 className="text-[22px] font-bold text-white">Define Your Content</h2>
                <p className="mt-2 text-[14px] text-zinc-400">Customize the tone, length, and target audience for your article</p>

                {/* Centered sentence builder */}
                <div className="mt-12 text-center text-[17px] leading-relaxed text-zinc-300">
                  Write a{' '}
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="mx-1 inline rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-[15px] font-semibold text-white focus:outline-none">
                    <option value="casual">Casual</option>
                    <option value="professional">Professional</option>
                    <option value="technical">Technical</option>
                    <option value="friendly">Friendly</option>
                  </select>
                  {' '}tone,{' '}
                  <select value={length} onChange={(e) => setLength(e.target.value)} className="mx-1 inline rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-[15px] font-semibold text-white focus:outline-none">
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                  {' '}length article for
                </div>

                {/* Target audience */}
                <div className="mt-8 w-full">
                  <input type="text" value={audienceText} onChange={(e) => setAudienceText(e.target.value)} placeholder="Search audiences..." className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-[14px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none" />
                  <p className="mt-2 text-[12px] text-zinc-500">Describe your target audience to improve content relevance</p>
                </div>
              </div>
            )}

            {/* ── Step 3: Additional Context ──── */}
            {step === 3 && (
              <div className="space-y-8">
                {/* Writing Perspective */}
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <User className="h-5 w-5 text-zinc-400" />
                    <span className="text-[15px] font-bold text-zinc-100">Writing Perspective</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { id: 'first', label: 'First Person', sub: 'I/We perspective' },
                      { id: 'second', label: 'Second Person', sub: 'You/Your perspective' },
                      { id: 'third', label: 'Third Person', sub: 'He/She/They perspective' },
                    ].map((p) => {
                      const sel = perspective === p.id;
                      return (
                        <button key={p.id} type="button" onClick={() => setPerspective(p.id)} className={cn('relative flex items-start justify-between rounded-xl border p-5 text-left transition-all', sel ? 'border-[var(--color-primary-600,#2455dc)]/50 bg-[var(--color-primary-600,#2455dc)]/8' : 'border-white/[0.06] hover:border-white/[0.12]')}>
                          <div>
                            <p className={cn('text-[14px] font-semibold', sel ? 'text-[var(--color-primary-600,#2455dc)]' : 'text-zinc-300')}>{p.label}</p>
                            <p className="mt-1 text-[12px] text-zinc-500">{p.sub}</p>
                          </div>
                          <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', sel ? 'border-[var(--color-primary-600,#2455dc)] bg-[var(--color-primary-600,#2455dc)]' : 'border-white/[0.15]')}>
                            {sel && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {perspective === 'second' && <p className="mt-2.5 text-[12px] text-zinc-500">Speaks directly to your reader</p>}
                  {perspective === 'first' && <p className="mt-2.5 text-[12px] text-zinc-500">Personal, author-driven voice</p>}
                  {perspective === 'third' && <p className="mt-2.5 text-[12px] text-zinc-500">Neutral, objective tone</p>}
                </div>

                {/* Article Sections */}
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-zinc-400" />
                    <span className="text-[15px] font-bold text-zinc-100">Article Sections</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {ARTICLE_SECTIONS.map((s) => {
                      const on = enabledSections.has(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleSection(s.id)} className={cn('relative flex items-start justify-between rounded-xl border p-5 text-left transition-all', on ? 'border-[var(--color-primary-600,#2455dc)]/50 bg-[var(--color-primary-600,#2455dc)]/8' : 'border-white/[0.06] hover:border-white/[0.12]')}>
                          <div>
                            <p className={cn('text-[14px] font-semibold', on ? 'text-[var(--color-primary-600,#2455dc)]' : 'text-zinc-300')}>{s.label}</p>
                            <p className="mt-1 text-[12px] text-zinc-500">{s.description}</p>
                          </div>
                          <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', on ? 'border-[var(--color-primary-600,#2455dc)] bg-[var(--color-primary-600,#2455dc)]' : 'border-white/[0.15]')}>
                            {on && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom CTA text */}
                {enabledSections.has('cta') && (
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-zinc-200">Custom call-to-action text</label>
                    <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value.slice(0, 200))} placeholder="e.g., Contact us, Download guide, Sign up..." className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-[14px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none" />
                    <p className="mt-1.5 text-right text-[11px] text-zinc-600">{ctaText.length}/200</p>
                  </div>
                )}

                {/* Additional Instructions */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Plus className="h-5 w-5 text-zinc-400" />
                      <span className="text-[15px] font-bold text-zinc-100">Additional Instructions</span>
                    </div>
                    <span className="rounded-md border border-white/[0.06] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Optional</span>
                  </div>
                  {instructions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {instructions.map((inst, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-4 py-2.5">
                          <span className="flex-1 text-[13px] text-zinc-300">{inst}</span>
                          <button type="button" onClick={() => setInstructions((prev) => prev.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <input type="text" value={newInstruction} onChange={(e) => setNewInstruction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addInstruction(); }} placeholder="Type additional instructions or paste URLs to be considered for analysis" className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none" />
                    <button type="button" onClick={addInstruction} disabled={!newInstruction.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Review & Generate ──── */}
            {step === 4 && !showTitleSelection && (
              <div className="space-y-7">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[20px] font-bold text-white">Content Brief Summary</h2>
                  <CheckCircle2 className="h-5 w-5 text-[#25c972]" />
                </div>

                {/* Topic & Prompts */}
                <div className="border-b border-white/[0.06] pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08]"><Circle className="h-3.5 w-3.5 text-zinc-400" /></div>
                      <div>
                        <p className="text-[15px] font-semibold text-zinc-100">Topic & Prompts</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">Topic: {topic || '(not set)'}</p>
                        {selectedPrompts.length > 0 && <p className="text-[13px] text-zinc-500">Prompts: <span className="text-[var(--color-primary-600,#2455dc)] underline">{selectedPrompts.length} prompt{selectedPrompts.length === 1 ? '' : 's'} selected</span></p>}
                        <p className="text-[13px] text-zinc-500">Type: {CONTENT_TYPES.find((t) => t.id === contentType)?.label ?? contentType}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-white"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  </div>
                </div>

                {/* Audience Settings */}
                <div className="border-b border-white/[0.06] pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08]"><User className="h-3.5 w-3.5 text-zinc-400" /></div>
                      <div>
                        <p className="text-[15px] font-semibold text-zinc-100">Audience Settings</p>
                        <p className="mt-1.5 text-[13px] text-zinc-500">
                          {audienceText ? `Audience: ${audienceText}` : 'Audience: General'}{' '}&nbsp;Tone: {tone}{' '}&nbsp;Length: {length}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setStep(2)} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-white"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  </div>
                </div>

                {/* Additional Context */}
                <div className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08]"><Lightbulb className="h-3.5 w-3.5 text-zinc-400" /></div>
                      <div>
                        <p className="text-[15px] font-semibold text-zinc-100">Additional Context</p>
                        <p className="mt-1.5 text-[13px] text-zinc-500">
                          Key Points: {ARTICLE_SECTIONS.filter((s) => enabledSections.has(s.id)).length}
                          {ctaText ? ` \u00B7 CTA: ${ctaText}` : ''}
                          {instructions.length > 0 ? ` \u00B7 ${instructions.length} instruction${instructions.length === 1 ? '' : 's'}` : ''}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setStep(3)} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-white"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Title Selection Phase ──── */}
            {step === 4 && showTitleSelection && (
              <div className="space-y-7">
                <div className="flex items-center gap-3">
                  <Type className="h-6 w-6 text-zinc-300" />
                  <h2 className="text-[20px] font-bold text-white">Choose Your Content Title</h2>
                </div>

                {titleSuggestLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /><span className="ml-3 text-[14px] text-zinc-500">Generating title suggestions...</span></div>
                ) : (
                  <div className="space-y-2.5">
                    {titleSuggestions.map((suggestion, i) => (
                      <button key={i} type="button" onClick={() => setTitle(suggestion)} className={cn('flex w-full rounded-xl border px-6 py-4.5 text-left text-[15px] transition-all', title === suggestion ? 'border-[var(--color-primary-600,#2455dc)]/40 bg-[var(--color-primary-600,#2455dc)]/8 font-medium text-[var(--color-primary-600,#2455dc)]' : 'border-white/[0.06] text-zinc-300 hover:border-white/[0.12] hover:bg-white/[0.02]')}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Title */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-zinc-400" />
                    <span className="text-[14px] font-semibold text-zinc-200">Custom Title</span>
                  </div>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your own title..." className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 text-[15px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none" />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-red-300">Something went wrong</p>
                    <p className="mt-0.5 text-[12px] text-red-400/80">{error}</p>
                  </div>
                  <button type="button" onClick={() => setError(null)} className="text-red-500/60 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}

          {/* ── Footer ──── */}
          <div className="mt-10 flex items-center justify-between border-t border-white/[0.06] pt-5">
            <div>
              {showTitleSelection ? (
                <button type="button" onClick={() => setShowTitleSelection(false)} className="inline-flex items-center gap-2 text-[14px] text-zinc-400 transition-colors hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : step > 1 ? (
                <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-[14px] text-zinc-400 transition-colors hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  Previous Step
                </button>
              ) : <span />}
            </div>

            <span className="text-[13px] text-zinc-500">Step {step} of {STEPS.length}</span>

            <div>
              {step < 4 ? (
                <button type="button" onClick={handleNext} disabled={!canProceed()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600,#2455dc)] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : showTitleSelection ? (
                <button type="button" onClick={() => void handleSubmit()} disabled={!title.trim() || submitting} className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-2.5 text-[14px] font-semibold text-zinc-900 transition-opacity hover:bg-white disabled:opacity-40">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><Sparkles className="h-4 w-4" />Continue</>}
                </button>
              ) : (
                <button type="button" onClick={() => { setShowTitleSelection(true); if (titleSuggestions.length === 0) void handleSuggestTitles(); }} className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-2.5 text-[14px] font-semibold text-zinc-900 transition-opacity hover:bg-white">
                  <Sparkles className="h-4 w-4" />
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

