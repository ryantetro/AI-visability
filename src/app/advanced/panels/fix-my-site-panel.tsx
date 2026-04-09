'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight, Bot, Check, ChevronDown, ChevronRight, Copy, Download,
  FileCode2, FileText, Globe, Loader2, RefreshCw, ScanSearch, Sparkles, Zap,
} from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { getCurrentAppPath } from '@/lib/app-paths';

interface FixMySiteOrder {
  id: string;
  domain: string;
  status: 'ordered' | 'in_progress' | 'delivered' | 'refunded';
  notes: string | null;
  files_requested: string[];
  amount_cents: number;
  created_at: string;
  completed_at: string | null;
  generated_files: Record<string, { filename: string; content: string; description: string }> | null;
  guide_markdown: string | null;
  agent_progress: {
    step: number;
    totalSteps: number;
    progress: number;
    currentTask: string;
    filesCompleted: string[];
    error: string | null;
    startedAt: string | null;
  } | null;
}

const ALL_FILES = [
  'robots_txt', 'llms_txt', 'structured_data', 'sitemap', 'meta_tags', 'schema_markup',
] as const;

const FILE_LABELS: Record<string, string> = {
  robots_txt: 'robots.txt',
  llms_txt: 'llms.txt',
  structured_data: 'Structured Data (JSON-LD)',
  sitemap: 'Sitemap',
  meta_tags: 'Meta Tags',
  schema_markup: 'Schema Markup',
};

const STATUS_STYLES: Record<string, string> = {
  ordered: 'bg-yellow-500/15 text-yellow-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  delivered: 'bg-[#25c972]/15 text-[#25c972]',
  refunded: 'bg-zinc-500/15 text-zinc-400',
};

const STATUS_LABELS: Record<string, string> = {
  ordered: 'Queued',
  in_progress: 'Agent Running',
  delivered: 'Delivered',
  refunded: 'Refunded',
};

/* ── What the agent delivers ─────────────────────────────────── */

const DELIVERABLES = [
  { label: 'robots.txt', desc: 'AI crawler access rules' },
  { label: 'llms.txt', desc: 'LLM-readable site summary' },
  { label: 'Structured Data', desc: 'JSON-LD schema markup' },
  { label: 'Sitemap', desc: 'Optimized XML sitemap' },
  { label: 'Meta Tags', desc: 'AI-optimized meta content' },
  { label: 'Schema Markup', desc: 'Rich result schemas' },
  { label: 'Implementation Guide', desc: 'Step-by-step install instructions' },
];

export function FixMySitePanel({ domain }: { domain: string }) {
  const [orders, setOrders] = useState<FixMySiteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/fix-my-site');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const hasGenerating = orders.some(o => o.status === 'in_progress');

  useEffect(() => {
    if (!hasGenerating) return;
    const interval = setInterval(() => {
      if (!document.hidden) void loadOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, [hasGenerating, loadOrders]);

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleRetry = async (orderId: string) => {
    try {
      const res = await fetch(`/api/fix-my-site/${orderId}/retry`, { method: 'POST' });
      if (res.ok) void loadOrders();
    } catch { /* ignore */ }
  };

  const handleCopyFile = async (content: string, fileType: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedFile(fileType);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleDownload = (orderId: string) => {
    window.open(`/api/fix-my-site/${orderId}/download`, '_blank');
  };

  const handleOrder = async () => {
    if (!domain.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/fix-my-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          notes: notes.trim() || undefined,
          filesRequested: [...ALL_FILES],
          returnPath: getCurrentAppPath('/dashboard'),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(data.error || 'Failed to create order');
        return;
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardPanel className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </DashboardPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Launch Agent ──────────────────────────────────────── */}
      <DashboardPanel className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25c972]/10">
            <Bot className="h-5 w-5 text-[#25c972]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#25c972]">AI Agent</p>
            <h2 className="text-lg font-semibold text-white">Fix My Site</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
              Our AI agent inspects your live site, analyzes your scan results, and generates
              every file you need for full AI visibility — delivered in minutes.
            </p>
          </div>
        </div>

        {/* How it works — 3-step flow */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: ScanSearch, label: 'Agent inspects your site', step: '1' },
            { icon: Sparkles, label: 'Generates all files', step: '2' },
            { icon: Download, label: 'Download your ZIP', step: '3' },
          ].map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-center gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-4 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25c972]/10">
                <s.icon className="h-4 w-4 text-[#25c972]" />
              </div>
              <p className="text-[11px] leading-tight text-zinc-400">{s.label}</p>
              {i < 2 && (
                <ArrowRight className="absolute -right-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              )}
            </div>
          ))}
        </div>

        {/* What you'll get — read-only deliverables */}
        <div className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            What the agent builds for <span className="text-zinc-300">{domain}</span>
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {DELIVERABLES.map(d => (
              <div key={d.label} className="flex items-start gap-2 py-1">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#25c972]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white">{d.label}</p>
                  <p className="text-[11px] text-zinc-500">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional notes (collapsed by default) */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', showNotes && 'rotate-90')} />
            Add notes for the agent
          </button>
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. preserve existing structured data, prefer Organization schema..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#25c972]/40 focus:outline-none focus:ring-1 focus:ring-[#25c972]/20"
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-[13px] text-red-400">{error}</p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleOrder}
          disabled={submitting}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25c972] text-[15px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {submitting ? 'Starting agent...' : 'Launch Agent — $499'}
        </button>

        <p className="mt-3 text-center text-[11px] text-zinc-600">
          One-time payment. Agent delivers files in minutes, not days. Secure checkout via Stripe.
        </p>
      </DashboardPanel>

      {/* ── Order History ─────────────────────────────────────── */}
      {orders.length > 0 && (
        <DashboardPanel className="p-5">
          <SectionTitle
            eyebrow="History"
            title="Agent Runs"
            description={`${orders.length} run${orders.length !== 1 ? 's' : ''}`}
          />

          <div className="mt-4 space-y-3">
            {orders.map(order => {
              const isExpanded = expandedOrder === order.id;
              const ap = order.agent_progress;

              const startedAt = ap?.startedAt ? new Date(ap.startedAt).getTime() : null;
              const elapsedMs = startedAt ? Date.now() - startedAt : 0;
              const isStalled5 = order.status === 'in_progress' && elapsedMs > 5 * 60 * 1000;
              const isStalled10 = order.status === 'in_progress' && elapsedMs > 10 * 60 * 1000;

              const hasError = order.status === 'ordered' && ap?.error;

              const generatedFileKeys = order.generated_files ? Object.keys(order.generated_files) : [];
              const currentTab = activeFileTab && generatedFileKeys.includes(activeFileTab)
                ? activeFileTab
                : generatedFileKeys[0] ?? null;
              const currentFileData = currentTab && order.generated_files
                ? order.generated_files[currentTab]
                : null;

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-white/8 bg-white/[0.02] p-4"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-zinc-500" />
                        <p className="text-sm font-semibold text-white">{order.domain}</p>
                      </div>
                      <p className="mt-0.5 pl-5.5 text-[11px] text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {order.status === 'in_progress' ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                        <Bot className="h-3 w-3 animate-pulse" />
                        Agent working...
                      </span>
                    ) : (
                      <span className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        STATUS_STYLES[order.status] ?? 'bg-zinc-500/15 text-zinc-400',
                      )}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    )}
                  </div>

                  {/* in_progress: progress bar + agent details */}
                  {order.status === 'in_progress' && ap && (
                    <div className="mt-4 space-y-3">
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${ap.progress}%` }}
                        />
                      </div>

                      {ap.currentTask && (
                        <p className="flex items-center gap-2 text-[12px] text-zinc-400">
                          <FileCode2 className="h-3.5 w-3.5 text-blue-400" />
                          {ap.currentTask}
                        </p>
                      )}

                      {/* File completion chips */}
                      {order.files_requested.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {order.files_requested.map(f => {
                            const done = ap.filesCompleted.includes(f);
                            return (
                              <span
                                key={f}
                                className={cn(
                                  'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]',
                                  done
                                    ? 'bg-[#25c972]/10 text-[#25c972]'
                                    : 'bg-white/[0.05] text-zinc-500',
                                )}
                              >
                                {done && <Check className="h-2.5 w-2.5" />}
                                {FILE_LABELS[f] ?? f}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {isStalled5 && !isStalled10 && (
                        <p className="text-[12px] text-yellow-400">
                          Taking longer than expected...
                        </p>
                      )}
                      {isStalled10 && (
                        <div className="flex items-center gap-3">
                          <p className="text-[12px] text-yellow-400">
                            Taking longer than expected...
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleRetry(order.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error state */}
                  {hasError && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[12px] text-red-400">
                        {ap?.error === 'no_scan'
                          ? 'Run a scan first, then click Retry.'
                          : ap?.error}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleRetry(order.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Delivered: View Results + Download */}
                  {order.status === 'delivered' && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Results
                          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(order.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#25c972]/10 px-3 py-1.5 text-[13px] font-medium text-[#25c972] transition-colors hover:bg-[#25c972]/20"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download ZIP
                        </button>
                      </div>

                      {/* Expanded results */}
                      {isExpanded && (
                        <div className="space-y-4 rounded-lg border border-white/8 bg-white/[0.02] p-4">
                          {order.guide_markdown && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                Implementation Guide
                              </p>
                              <pre className="whitespace-pre-wrap text-[13px] text-zinc-300 font-mono leading-relaxed">
                                {order.guide_markdown}
                              </pre>
                            </div>
                          )}

                          {generatedFileKeys.length > 0 && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                Generated Files
                              </p>
                              <div className="flex flex-wrap gap-1 border-b border-white/8 pb-2">
                                {generatedFileKeys.map(key => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setActiveFileTab(key)}
                                    className={cn(
                                      'rounded-md px-2.5 py-1 text-[12px] transition-colors',
                                      currentTab === key
                                        ? 'bg-white/10 text-white'
                                        : 'text-zinc-500 hover:text-zinc-300',
                                    )}
                                  >
                                    {FILE_LABELS[key] ?? key}
                                  </button>
                                ))}
                              </div>

                              {currentFileData && (
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-medium text-white">
                                        {currentFileData.filename}
                                      </p>
                                      {currentFileData.description && (
                                        <p className="mt-0.5 text-[12px] text-zinc-500">
                                          {currentFileData.description}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyFile(currentFileData.content, currentTab!)}
                                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                                    >
                                      {copiedFile === currentTab ? (
                                        <>
                                          <Check className="h-3.5 w-3.5 text-[#25c972]" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3.5 w-3.5" />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-[12px] font-mono text-zinc-300 leading-relaxed">
                                    {currentFileData.content}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      )}
    </div>
  );
}
