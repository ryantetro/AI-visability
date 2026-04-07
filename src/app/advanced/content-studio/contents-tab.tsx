'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentWizard } from './content-wizard';
import { BriefViewer } from './brief-viewer';

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

/* ── Cache ─────────────────────────────────────────────────────────────── */

const CACHE_TTL_MS = 2 * 60 * 1000;
function cacheKey(domain: string) { return `cs_items:${domain}`; }

function readCache(domain: string): ContentItem[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(domain));
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as { data: ContentItem[]; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function writeCache(domain: string, data: ContentItem[]) {
  try { localStorage.setItem(cacheKey(domain), JSON.stringify({ data, cachedAt: Date.now() })); } catch {}
}

function invalidateCache(domain: string) {
  try { localStorage.removeItem(cacheKey(domain)); } catch {}
}

/* ── Status Badges ──────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft:               { label: 'Draft',        className: 'bg-zinc-500/15 text-zinc-400' },
  brief_generating:    { label: 'Generating',   className: 'bg-blue-500/15 text-blue-400 animate-pulse' },
  brief_ready:         { label: 'Brief Ready',  className: 'bg-[#25c972]/15 text-[#25c972]' },
  article_generating:  { label: 'Writing',      className: 'bg-blue-500/15 text-blue-400 animate-pulse' },
  article_ready:       { label: 'Article Ready', className: 'bg-purple-500/15 text-purple-400' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', s.className)}>
      {s.label}
    </span>
  );
}

/* ── Content Type Labels ────────────────────────────────────────────── */

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

/* ── Main Component ──────────────────────────────────────────────────── */

type View = 'list' | 'wizard' | 'viewer';

export function ContentsTab({ domain }: { domain: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = readCache(domain);
      if (cached) {
        setItems(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/content-studio?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        writeCache(domain, data.items ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [domain]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/content-studio/${id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateCache(domain);
        setItems((prev) => prev.filter((i) => i.id !== id));
        setDeleteConfirm(null);
      }
    } catch { /* ignore */ }
  };

  const handleWizardComplete = (item: ContentItem) => {
    invalidateCache(domain);
    setItems((prev) => [item, ...prev]);
    setSelectedItem(item);
    setView('viewer');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedItem(null);
    void fetchItems(true);
  };

  /* ── Wizard View ──── */
  if (view === 'wizard') {
    return (
      <ContentWizard
        domain={domain}
        onComplete={handleWizardComplete}
        onCancel={handleBackToList}
      />
    );
  }

  /* ── Viewer View ──── */
  if (view === 'viewer' && selectedItem) {
    return (
      <BriefViewer
        item={selectedItem}
        onBack={handleBackToList}
      />
    );
  }

  /* ── List View ──── */
  const filtered = items.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (TYPE_LABELS[i.content_type] ?? i.content_type).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.05] pl-9 pr-3 text-[13px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setView('wizard')}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600,#2455dc)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Content
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
            <Plus className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="mt-4 text-[14px] font-medium text-zinc-300">
            {items.length === 0 ? 'No content yet' : 'No matching content'}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {items.length === 0
              ? 'Create your first content to get started.'
              : 'Try adjusting your search.'}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={() => setView('wizard')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600,#2455dc)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create Content
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Content Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-zinc-200">{item.title}</td>
                  <td className="px-4 py-3 text-zinc-400">{TYPE_LABELS[item.content_type] ?? item.content_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedItem(item); setView('viewer'); }}
                        className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {deleteConfirm === item.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="rounded-md px-2 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.05]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(item.id)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
