'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Download, FileText, Loader2, RefreshCw, Wrench } from 'lucide-react';
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

const FILE_OPTIONS = [
  { value: 'robots_txt', label: 'robots.txt' },
  { value: 'llms_txt', label: 'llms.txt' },
  { value: 'structured_data', label: 'Structured Data (JSON-LD)' },
  { value: 'sitemap', label: 'Sitemap' },
  { value: 'meta_tags', label: 'Meta Tags' },
  { value: 'schema_markup', label: 'Schema Markup' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  ordered: 'bg-yellow-500/15 text-yellow-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  delivered: 'bg-[#25c972]/15 text-[#25c972]',
  refunded: 'bg-zinc-500/15 text-zinc-400',
};

const STATUS_LABELS: Record<string, string> = {
  ordered: 'Ordered',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  refunded: 'Refunded',
};

const FILE_LABELS: Record<string, string> = Object.fromEntries(
  FILE_OPTIONS.map(f => [f.value, f.label]),
);

export function FixMySitePanel({ domain }: { domain: string }) {
  const [orders, setOrders] = useState<FixMySiteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [orderDomain, setOrderDomain] = useState(domain);
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(FILE_OPTIONS.map(f => f.value)),
  );

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

  const toggleFile = (value: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

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
    if (!orderDomain.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/fix-my-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: orderDomain.trim(),
          notes: notes.trim() || undefined,
          filesRequested: Array.from(selectedFiles),
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
      {/* Order form */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Professional service"
          title="Fix My Site"
          description="Let our team optimize your AI visibility files. We'll handle robots.txt, llms.txt, structured data, sitemap, schema markup, and meta tags."
        />

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="fms-domain" className="mb-1.5 block text-[12px] font-medium text-zinc-400">
              Domain
            </label>
            <input
              id="fms-domain"
              type="text"
              value={orderDomain}
              onChange={(e) => setOrderDomain(e.target.value)}
              placeholder="example.com"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#25c972]/40 focus:outline-none focus:ring-1 focus:ring-[#25c972]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium text-zinc-400">
              Files to optimize
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FILE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleFile(opt.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors',
                    selectedFiles.has(opt.value)
                      ? 'border-[#25c972]/30 bg-[#25c972]/[0.06] text-white'
                      : 'border-white/8 bg-white/[0.02] text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  <span className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    selectedFiles.has(opt.value)
                      ? 'border-[#25c972]/40 bg-[#25c972]/20'
                      : 'border-white/15 bg-transparent',
                  )}>
                    {selectedFiles.has(opt.value) && (
                      <Check className="h-2.5 w-2.5 text-[#25c972]" />
                    )}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fms-notes" className="mb-1.5 block text-[12px] font-medium text-zinc-400">
              Notes <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              id="fms-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any specific requirements or context for our team..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#25c972]/40 focus:outline-none focus:ring-1 focus:ring-[#25c972]/20"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-400">{error}</p>
          )}

          <button
            type="button"
            onClick={handleOrder}
            disabled={submitting || !orderDomain.trim() || selectedFiles.size === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25c972] text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            {submitting ? 'Creating order...' : 'Order for $499'}
          </button>

          <p className="text-center text-[11px] text-zinc-600">
            One-time payment. AI-generated files delivered in minutes. Secure checkout via Stripe.
          </p>
        </div>
      </DashboardPanel>

      {/* Order history */}
      {orders.length > 0 && (
        <DashboardPanel className="p-5">
          <SectionTitle
            eyebrow="Order history"
            title="Your orders"
            description={`${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          />

          <div className="mt-4 space-y-3">
            {orders.map(order => {
              const isExpanded = expandedOrder === order.id;
              const ap = order.agent_progress;

              // Stall detection for in_progress orders
              const startedAt = ap?.startedAt ? new Date(ap.startedAt).getTime() : null;
              const elapsedMs = startedAt ? Date.now() - startedAt : 0;
              const isStalled5 = order.status === 'in_progress' && elapsedMs > 5 * 60 * 1000;
              const isStalled10 = order.status === 'in_progress' && elapsedMs > 10 * 60 * 1000;

              // Error state: ordered + agent_progress.error
              const hasError = order.status === 'ordered' && ap?.error;

              // Generated file tabs for delivered orders
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
                      <p className="text-sm font-semibold text-white">{order.domain}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {order.status === 'in_progress' ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Generating...
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

                  {/* Files requested chips */}
                  {order.files_requested.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {order.files_requested.map(f => (
                        <span
                          key={f}
                          className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-400"
                        >
                          {FILE_LABELS[f] ?? f}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* in_progress: progress bar + agent details */}
                  {order.status === 'in_progress' && ap && (
                    <div className="mt-4 space-y-3">
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${ap.progress}%` }}
                        />
                      </div>

                      {/* Current task */}
                      {ap.currentTask && (
                        <p className="text-[12px] text-zinc-400">{ap.currentTask}</p>
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

                      {/* Stall warnings */}
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

                  {/* Error state: ordered + agent_progress.error */}
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
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download ZIP
                        </button>
                      </div>

                      {/* Expanded results */}
                      {isExpanded && (
                        <div className="space-y-4 rounded-lg border border-white/8 bg-white/[0.02] p-4">
                          {/* Guide markdown */}
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

                          {/* File tabs */}
                          {generatedFileKeys.length > 0 && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                Generated Files
                              </p>
                              {/* Tab bar */}
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

                              {/* Active tab content */}
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
