'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────────────── */

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  status: string;
  topic: string | null;
  brief_markdown: string | null;
  article_markdown: string | null;
  workflow_progress: { step: number; progress: number; currentTask: string } | null;
  created_at: string;
  updated_at: string;
}

/* ── Status Badges ──────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft:               { label: 'Draft',        className: 'bg-zinc-500/15 text-zinc-400' },
  brief_generating:    { label: 'Generating',   className: 'bg-blue-500/15 text-blue-400 animate-pulse' },
  brief_ready:         { label: 'Brief Ready',  className: 'bg-[#25c972]/15 text-[#25c972]' },
  article_generating:  { label: 'Writing',      className: 'bg-blue-500/15 text-blue-400 animate-pulse' },
  article_ready:       { label: 'Article Ready', className: 'bg-purple-500/15 text-purple-400' },
};

const TYPE_LABELS: Record<string, string> = {
  blog_post: 'Blog Post',
  listicle: 'Listicle',
  how_to_guide: 'How-To Guide',
  case_study: 'Case Study',
  comparison: 'Comparison',
  review: 'Review',
  social_post: 'Social Post',
  product_page: 'Product Page',
  landing_page: 'Landing Page',
};

/* ── Workflow Steps ──────────────────────────────────────────────────── */

const WORKFLOW_STEPS = [
  { step: 1, label: 'Web Research' },
  { step: 2, label: 'Quote Extraction' },
  { step: 3, label: 'Outline Generation' },
  { step: 4, label: 'Brief Generation' },
  { step: 5, label: 'Article Generation' },
];

/* ── Main Component ──────────────────────────────────────────────────── */

export function BriefViewer({
  item: initialItem,
  onBack,
}: {
  item: ContentItem;
  onBack: () => void;
}) {
  const [item, setItem] = useState(initialItem);
  const [activeView, setActiveView] = useState<'brief' | 'article'>('brief');

  const isGenerating = item.status === 'brief_generating' || item.status === 'article_generating';

  // Poll for updates while generating
  useEffect(() => {
    if (!isGenerating) return;
    let active = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/content-studio/${item.id}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setItem(data);
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [item.id, isGenerating]);

  const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.draft;
  const progress = item.workflow_progress;
  const currentStep = progress?.step ?? 0;
  const content = activeView === 'article' ? item.article_markdown : item.brief_markdown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </button>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
          {TYPE_LABELS[item.content_type] ?? item.content_type}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', status.className)}>
          {status.label}
        </span>
      </div>

      <h1 className="text-xl font-bold text-white">{item.title}</h1>

      <div className="flex gap-6">
        {/* Main content area */}
        <div className="min-w-0 flex-1">
          {/* Brief/Article tabs */}
          {(item.brief_markdown || item.article_markdown) && (
            <div className="mb-4 flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
              <button
                type="button"
                onClick={() => setActiveView('brief')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                  activeView === 'brief'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                Brief
              </button>
              <button
                type="button"
                onClick={() => setActiveView('article')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                  activeView === 'article'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                Article
              </button>
            </div>
          )}

          {/* Content */}
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#1c1c1e] py-16">
              <div className="relative flex h-20 w-20 items-center justify-center">
                {/* Spinning ring */}
                <svg className="h-20 w-20 animate-spin" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="40" cy="40" r="35" fill="none"
                    stroke="#2455dc"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(progress?.progress ?? 10) * 2.2} 220`}
                  />
                </svg>
                <span className="absolute text-[16px] font-bold text-white">
                  {progress?.progress ?? 0}%
                </span>
              </div>
              <p className="mt-4 text-[14px] font-medium text-white">
                {progress?.currentTask ?? 'Starting...'}
              </p>
              <p className="mt-1 text-[12px] text-zinc-500">
                Please wait while we generate your content
              </p>
            </div>
          ) : content ? (
            <div className="rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6">
              <div className="prose prose-invert prose-sm max-w-none text-zinc-300 prose-headings:text-white prose-strong:text-zinc-200 prose-a:text-[#2455dc]">
                {/* Simple markdown rendering — splits by line for basic formatting */}
                {content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-6 first:mt-0">{line.slice(2)}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-white mt-5">{line.slice(3)}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-[15px] font-semibold text-white mt-4">{line.slice(4)}</h3>;
                  if (line.startsWith('- ')) return <li key={i} className="ml-4 text-[13px] text-zinc-300 list-disc">{line.slice(2)}</li>;
                  if (line.startsWith('---')) return <hr key={i} className="border-white/[0.06] my-4" />;
                  if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="text-[12px] italic text-zinc-500">{line.replace(/\*/g, '')}</p>;
                  if (line.trim() === '') return <div key={i} className="h-2" />;
                  return <p key={i} className="text-[13px] leading-6 text-zinc-300">{formatInline(line)}</p>;
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#1c1c1e] py-16 text-center">
              <FileText className="h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-[14px] text-zinc-400">
                {activeView === 'article' ? 'No article generated yet.' : 'No brief generated yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar — Workflow */}
        <div className="hidden w-56 shrink-0 lg:block">
          <div className="rounded-xl border border-white/[0.06] bg-[#1c1c1e] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Workflow</p>
            <div className="mt-3 space-y-2.5">
              {WORKFLOW_STEPS.map((ws) => {
                const isDone = currentStep > ws.step;
                const isActive = currentStep === ws.step && isGenerating;
                return (
                  <div key={ws.step} className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#25c972]" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#2455dc]" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-zinc-600" />
                    )}
                    <span className={cn(
                      'text-[12px]',
                      isDone ? 'text-zinc-400' : isActive ? 'font-medium text-white' : 'text-zinc-600',
                    )}>
                      {ws.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inline formatting helper ──────────────────────────────────────── */

function formatInline(text: string): React.ReactNode {
  // Very simple bold/italic rendering — replace **text** with <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-zinc-200">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
