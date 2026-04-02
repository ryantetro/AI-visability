'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, FileText, Lock, Loader2, Sparkles } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { usePlan } from '@/hooks/use-plan';

interface GeneratedPage {
  id: string;
  title: string;
  slug: string;
  topic: string;
  word_count: number;
  created_at: string;
}

interface GenerateResult {
  title: string;
  slug: string;
  markdown: string;
  htmlHead: string;
  faqSchema: string;
  wordCount: number;
  generatedAt: string;
}

export function ContentGeneratorPanel({ domain }: { domain: string }) {
  const { tier, maxContentPages } = usePlan();
  const hasAccess = tier === 'pro' || tier === 'growth';

  const [topic, setTopic] = useState('');
  const [brand, setBrand] = useState('');
  const [industry, setIndustry] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState<'professional' | 'conversational' | 'technical'>('professional');

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<GeneratedPage[]>([]);
  const [usage, setUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 0 });
  const [historyLoading, setHistoryLoading] = useState(true);

  const [copied, setCopied] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!hasAccess) { setHistoryLoading(false); return; }
    try {
      const res = await fetch(`/api/content-generate?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.pages ?? []);
        setUsage(data.usage ?? { used: 0, limit: 0 });
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false);
    }
  }, [domain, hasAccess]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/content-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          domain,
          brand: brand.trim() || undefined,
          industry: industry.trim() || undefined,
          keywords: keywords.trim() ? keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
          tone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Generation failed');
        return;
      }

      setResult(data);
      setTopic('');
      void loadHistory();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(c => c === label ? null : c), 2000);
    } catch { /* clipboard blocked */ }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ── Locked state ──────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <DashboardPanel className="p-6">
        <SectionTitle
          eyebrow="Content"
          title="AI-Optimized Page Generator"
          description="Generate structured content pages designed to maximize your AI visibility."
        />
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12">
          <Lock className="h-8 w-8 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-500">Upgrade to Pro to unlock content generation</p>
          <p className="mt-1 text-[12px] text-gray-400">Create AI-optimized pages with FAQ schema, structured data, and citation-friendly formats.</p>
        </div>
      </DashboardPanel>
    );
  }

  const atLimit = usage.limit > 0 && usage.used >= usage.limit;

  return (
    <DashboardPanel className="p-6">
      <SectionTitle
        eyebrow="Content"
        title="AI-Optimized Page Generator"
        description="Generate structured content pages designed to maximize your AI visibility."
      />

      {/* Usage meter */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: usage.limit > 0 ? `${Math.min((usage.used / usage.limit) * 100, 100)}%` : '0%',
              backgroundColor: atLimit ? '#ff5252' : '#a855f7',
            }}
          />
        </div>
        <span className={cn('text-[11px] font-medium tabular-nums', atLimit ? 'text-[#ff5252]' : 'text-gray-500')}>
          {usage.used} / {usage.limit > 0 ? usage.limit : maxContentPages} pages this month
        </span>
      </div>

      {/* Generator form */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="space-y-4">
          {/* Topic */}
          <div>
            <label htmlFor="cg-topic" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              Topic <span className="text-[#ff5252]">*</span>
            </label>
            <input
              id="cg-topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Best practices for local SEO in 2025"
              maxLength={200}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#a855f7]/50"
            />
          </div>

          {/* Brand + Industry row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cg-brand" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Brand Name
              </label>
              <input
                id="cg-brand"
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder={domain}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#a855f7]/50"
              />
            </div>
            <div>
              <label htmlFor="cg-industry" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Industry
              </label>
              <input
                id="cg-industry"
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="e.g. SaaS, E-commerce, Healthcare"
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#a855f7]/50"
              />
            </div>
          </div>

          {/* Keywords + Tone row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cg-keywords" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Target Keywords
              </label>
              <input
                id="cg-keywords"
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="comma-separated keywords"
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#a855f7]/50"
              />
            </div>
            <div>
              <label htmlFor="cg-tone" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Tone
              </label>
              <select
                id="cg-tone"
                value={tone}
                onChange={e => setTone(e.target.value as typeof tone)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#a855f7]/50"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !topic.trim() || atLimit}
              className="inline-flex items-center gap-2 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-5 py-2.5 text-sm font-medium text-[#a855f7] transition-colors hover:bg-[#a855f7]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : atLimit ? 'Limit Reached' : 'Generate Page'}
            </button>
            {atLimit && (
              <span className="text-[11px] text-[#ff5252]">
                Monthly limit reached. Upgrade for more pages.
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-[#ff5252]">{error}</p>
          )}
        </div>
      </div>

      {/* Generated result */}
      {result && (
        <div className="mt-5 rounded-xl border border-[#a855f7]/20 bg-[#a855f7]/[0.03] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#a855f7]">Generated</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{result.title}</h3>
              <p className="mt-1 text-[12px] text-gray-500">
                {result.wordCount.toLocaleString()} words &middot; /{result.slug}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-gray-700 font-sans">
              {result.markdown}
            </pre>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCopy(result.markdown, 'markdown')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === 'markdown' ? 'Copied!' : 'Copy Markdown'}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(result.htmlHead, 'head')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === 'head' ? 'Copied!' : 'Copy HTML Head'}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(result.faqSchema, 'faq')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === 'faq' ? 'Copied!' : 'Copy FAQ Schema'}
            </button>
            <button
              type="button"
              onClick={() => handleDownload(`${result.slug}.md`, result.markdown)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {historyLoading ? (
        <div className="mt-5 flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-400" />
        </div>
      ) : history.length > 0 ? (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Recent Pages</p>
          <div className="mt-3 space-y-2">
            {history.map(page => (
              <div
                key={page.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-gray-700">{page.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {page.word_count.toLocaleString()} words &middot; {new Date(page.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </DashboardPanel>
  );
}
