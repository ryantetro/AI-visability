'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Loader2,
  Sparkles,
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

/* ── Constants ─────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft:              { label: 'Draft',         className: 'bg-zinc-500/15 text-zinc-400' },
  brief_generating:   { label: 'Researching',   className: 'bg-blue-500/15 text-blue-400 animate-pulse' },
  brief_ready:        { label: 'Brief Ready',   className: 'bg-[#25c972]/15 text-[#25c972]' },
  article_generating: { label: 'Writing',        className: 'bg-violet-500/15 text-violet-400 animate-pulse' },
  article_ready:      { label: 'Article Ready',  className: 'bg-purple-500/15 text-purple-400' },
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

const WORKFLOW_STEPS = [
  { step: 1, label: 'Web Research',       description: 'Searching and analyzing sources' },
  { step: 2, label: 'Data Extraction',    description: 'Pulling key quotes and stats' },
  { step: 3, label: 'Outline',            description: 'Building content structure' },
  { step: 4, label: 'Brief Generation',   description: 'Writing comprehensive brief' },
  { step: 5, label: 'Article Generation', description: 'Writing full article' },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function countSources(text: string | null): number {
  if (!text) return 0;
  const urlPattern = /https?:\/\/[^\s)>\]]+/g;
  const urls = new Set(text.match(urlPattern) ?? []);
  return urls.size;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
  const [articleLoading, setArticleLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isGenerating = item.status === 'brief_generating' || item.status === 'article_generating';
  const content = activeView === 'article' ? item.article_markdown : item.brief_markdown;

  const stats = useMemo(() => ({
    words: wordCount(content),
    sources: countSources(content),
  }), [content]);

  const handleGenerateArticle = async () => {
    setArticleLoading(true);
    try {
      const res = await fetch(`/api/content-studio/${item.id}/generate-article`, { method: 'POST' });
      if (res.ok) {
        setItem((prev) => ({
          ...prev,
          status: 'article_generating',
          workflow_progress: { step: 5, progress: 0, currentTask: 'Starting article generation...' },
        }));
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error) alert(data.error);
      }
    } catch { /* ignore */ }
    setArticleLoading(false);
  };

  const handleCopy = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}-${activeView}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, item.title, activeView]);

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

  // Auto-switch to article tab when article is ready
  useEffect(() => {
    if (item.status === 'article_ready' && item.article_markdown) {
      setActiveView('article');
    }
  }, [item.status, item.article_markdown]);

  const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.draft;
  const progress = item.workflow_progress;
  const currentStep = progress?.step ?? 0;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="h-4 w-px bg-white/10" />
        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {TYPE_LABELS[item.content_type] ?? item.content_type}
        </span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold', status.className)}>
          {status.label}
        </span>
      </div>

      {/* ── Title + Actions ────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-white">{item.title}</h1>
          {item.topic && (
            <p className="mt-1 text-[13px] text-zinc-500">{item.topic}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.status === 'brief_ready' && (
            <button
              type="button"
              onClick={handleGenerateArticle}
              disabled={articleLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2455dc] px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[#2455dc]/20 transition-all hover:bg-[#1e47b8] hover:shadow-md hover:shadow-[#2455dc]/30 disabled:opacity-50"
            >
              {articleLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Article
            </button>
          )}
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────── */}
      <div className="flex gap-5">
        {/* ── Content Area ──────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Tab Bar + Actions */}
          {(item.brief_markdown || item.article_markdown) && !isGenerating && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                <button
                  type="button"
                  onClick={() => setActiveView('brief')}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors',
                    activeView === 'brief'
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  Brief
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('article')}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors',
                    activeView === 'article'
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                    !item.article_markdown && 'opacity-40 cursor-not-allowed',
                  )}
                  disabled={!item.article_markdown}
                >
                  Article
                </button>
              </div>
              {content && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                  >
                    <ClipboardCopy className="h-3 w-3" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content stats bar */}
          {content && !isGenerating && (
            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Hash className="h-3 w-3" />
                {stats.words.toLocaleString()} words
              </div>
              {stats.sources > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <ExternalLink className="h-3 w-3" />
                  {stats.sources} sources
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <FileText className="h-3 w-3" />
                {activeView === 'brief' ? 'Content Brief' : 'Full Article'}
              </div>
              <div className="ml-auto text-[11px] text-zinc-600">
                Updated {formatDate(item.updated_at)}
              </div>
            </div>
          )}

          {/* Main content */}
          {isGenerating ? (
            <GeneratingState progress={progress} status={item.status} />
          ) : content ? (
            <div className="rounded-2xl border border-white/[0.06] bg-[#1c1c1e]">
              <div className="p-6 sm:p-8">
                <MarkdownContent content={content} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#1c1c1e] py-20 text-center">
              <FileText className="h-10 w-10 text-zinc-700" />
              <p className="mt-4 text-[14px] font-medium text-zinc-400">
                {activeView === 'article' ? 'No article generated yet' : 'No brief generated yet'}
              </p>
              <p className="mt-1 text-[12px] text-zinc-600">
                {activeView === 'article'
                  ? 'Generate a brief first, then create your article'
                  : 'Click "Generate" to start the AI research pipeline'}
              </p>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────── */}
        <div className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            {/* Workflow tracker */}
            <div className="rounded-xl border border-white/[0.06] bg-[#1c1c1e] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Pipeline
              </p>
              <div className="mt-3 space-y-1">
                {WORKFLOW_STEPS.map((ws) => {
                  const isDone = currentStep > ws.step || (item.status === 'article_ready' && ws.step <= 5) || (item.status === 'brief_ready' && ws.step <= 4);
                  const isActive = currentStep === ws.step && isGenerating;
                  return (
                    <div
                      key={ws.step}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                        isActive && 'bg-[#2455dc]/[0.08]',
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#25c972]" />
                      ) : isActive ? (
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#2455dc]" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700" />
                      )}
                      <div className="min-w-0">
                        <p className={cn(
                          'text-[12px] leading-tight',
                          isDone ? 'text-zinc-400' : isActive ? 'font-medium text-white' : 'text-zinc-600',
                        )}>
                          {ws.label}
                        </p>
                        {isActive && (
                          <p className="mt-0.5 text-[10px] text-[#2455dc]">
                            {progress?.currentTask ?? ws.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content metadata */}
            {content && !isGenerating && (
              <div className="rounded-xl border border-white/[0.06] bg-[#1c1c1e] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Details
                </p>
                <dl className="mt-3 space-y-2.5">
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Words</dt>
                    <dd className="text-[13px] font-semibold text-white">{stats.words.toLocaleString()}</dd>
                  </div>
                  {stats.sources > 0 && (
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Sources</dt>
                      <dd className="text-[13px] font-semibold text-white">{stats.sources}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Type</dt>
                    <dd className="text-[13px] text-zinc-300">{TYPE_LABELS[item.content_type] ?? item.content_type}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Created</dt>
                    <dd className="text-[12px] text-zinc-400">{formatDate(item.created_at)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Generating State ─────────────────────────────────────────────── */

function GeneratingState({
  progress,
  status,
}: {
  progress: ContentItem['workflow_progress'];
  status: string;
}) {
  const pct = progress?.progress ?? 0;
  const task = progress?.currentTask ?? 'Starting agent...';
  const isBrief = status === 'brief_generating';

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#1c1c1e] py-20">
      {/* Animated progress ring */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r="42"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="3"
          />
          <circle
            cx="48" cy="48" r="42"
            fill="none"
            stroke={isBrief ? '#2455dc' : '#8b5cf6'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.64} 264`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-[18px] font-bold tabular-nums text-white">
          {pct}%
        </span>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[15px] font-semibold text-white">
          {isBrief ? 'Researching & Writing Brief' : 'Writing Article'}
        </p>
        <p className="mt-1.5 max-w-sm text-[13px] text-zinc-400">
          {task}
        </p>
        <p className="mt-4 text-[11px] text-zinc-600">
          AI agent is autonomously researching, analyzing, and writing your content
        </p>
      </div>
    </div>
  );
}

/* ── Markdown Renderer ────────────────────────────────────────────── */

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-4 mt-8 border-b border-white/[0.06] pb-3 text-[22px] font-bold leading-tight text-white first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 mt-8 text-[18px] font-semibold leading-tight text-white first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-6 text-[15px] font-semibold leading-tight text-white">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-2 mt-5 text-[14px] font-semibold text-zinc-200">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="mb-3 text-[13.5px] leading-[1.75] text-zinc-300">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-1 list-none space-y-1.5">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-1 list-decimal space-y-1.5 pl-5 marker:text-zinc-500">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-[13px] leading-relaxed text-zinc-300 before:mr-2 before:text-zinc-600 before:content-['•'] [ol_&]:before:content-none">
            {children}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-2 border-[#2455dc]/40 bg-[#2455dc]/[0.04] py-2 pl-4 pr-3">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4d8af0] underline decoration-[#4d8af0]/30 underline-offset-2 transition-colors hover:text-[#6da1f7] hover:decoration-[#4d8af0]/60"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-zinc-100">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-zinc-400">{children}</em>
        ),
        hr: () => (
          <hr className="my-6 border-white/[0.06]" />
        ),
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-[12px]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-white/[0.06] bg-white/[0.03]">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-t border-white/[0.03] px-3 py-2 text-zinc-300">
            {children}
          </td>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-white/[0.06] bg-black/30 p-4">
                <code className="text-[12px] leading-relaxed text-zinc-300" {...props}>
                  {children}
                </code>
              </div>
            );
          }
          return (
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-zinc-300" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
