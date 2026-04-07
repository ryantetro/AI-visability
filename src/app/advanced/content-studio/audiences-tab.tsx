'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────────────── */

interface Audience {
  id: string;
  name: string;
  description: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/* ── Cache ─────────────────────────────────────────────────────────────── */

const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_KEY = 'cs_audiences';

function readCache(): Audience[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as { data: Audience[]; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function writeCache(data: Audience[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() })); } catch {}
}

function invalidateCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

/* ── Modal primitives ─────────────────────────────────────────────────── */

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
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

/* ── Toast ─────────────────────────────────────────────────────────────── */

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 fade-in">
      <div className="flex items-center gap-2 rounded-xl border border-[#25c972]/30 bg-[#1c1c1e] px-4 py-3 shadow-lg">
        <Sparkles className="h-4 w-4 text-[#25c972]" />
        <span className="text-[13px] text-zinc-200">{message}</span>
        <button type="button" onClick={onDismiss} className="ml-2 text-zinc-500 hover:text-zinc-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Create/Edit Audience Modal ───────────────────────────────────────── */

function AudienceModal({
  audience,
  onClose,
  onSaved,
}: {
  audience: Audience | null; // null = create mode
  onClose: () => void;
  onSaved: (a: Audience) => void;
}) {
  const isEdit = !!audience;
  const [name, setName] = useState(audience?.name ?? '');
  const [description, setDescription] = useState(audience?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const url = isEdit ? `/api/content-studio/audiences/${audience.id}` : '/api/content-studio/audiences';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save.');
        setSaving(false);
        return;
      }

      const saved = await res.json();
      onSaved(saved);
    } catch {
      setError('Network error.');
      setSaving(false);
    }
  };

  const handleEnhance = async () => {
    if (!isEdit) {
      // Need to save first, then enhance
      if (!name.trim()) {
        setError('Save the audience first, then enhance.');
        return;
      }
      // Create, then enhance
      setSaving(true);
      try {
        const createRes = await fetch('/api/content-studio/audiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description || null }),
        });
        if (!createRes.ok) {
          setSaving(false);
          return;
        }
        const created = await createRes.json();
        setSaving(false);
        setEnhancing(true);

        const enhRes = await fetch(`/api/content-studio/audiences/${created.id}/enhance`, { method: 'POST' });
        if (enhRes.ok) {
          const enhanced = await enhRes.json();
          setDescription(enhanced.description || '');
          setToast('Description enhanced! You can edit further if needed.');
          // Update the audience reference so next save is a PUT
          onSaved(enhanced);
          onClose();
        }
        setEnhancing(false);
      } catch {
        setSaving(false);
        setEnhancing(false);
      }
      return;
    }

    setEnhancing(true);
    try {
      const res = await fetch(`/api/content-studio/audiences/${audience.id}/enhance`, { method: 'POST' });
      if (res.ok) {
        const enhanced = await res.json();
        setDescription(enhanced.description || '');
        setToast('Description enhanced! You can edit further if needed.');
      }
    } catch { /* ignore */ }
    setEnhancing(false);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {isEdit ? 'Edit Audience' : 'Create Audience'}
            </h2>
            <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[12px] font-medium text-zinc-300">Audience Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Enterprise SaaS Decision Makers"
                className="mt-1.5 h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 text-[13px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">A descriptive name for this target audience</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-zinc-300">Description</label>
              <div className="mt-1.5">
                {/* Simple formatting toolbar */}
                <div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
                  {['B', 'I', 'S', '<>', 'H2', 'H3', 'UL', 'OL', '""', '—'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
                      title={btn}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this audience's demographics, pain points, goals, and preferences..."
                  rows={6}
                  className="w-full rounded-b-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-[13px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none"
                />
              </div>
            </div>

            {/* Enhance button */}
            <button
              type="button"
              onClick={() => void handleEnhance()}
              disabled={enhancing || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2455dc]/30 bg-[#2455dc]/8 px-3 py-2 text-[12px] font-medium text-[#7ba4f7] transition-colors hover:bg-[#2455dc]/12 disabled:opacity-40"
            >
              {enhancing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI is enhancing your description...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Enhance With AI
                </>
              )}
            </button>

            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600,#2455dc)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Save Changes' : 'Create Audience'}
            </button>
          </div>
        </div>
      </ModalCard>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </ModalBackdrop>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export function AudiencesTab({ domain }: { domain: string }) {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAudience, setEditingAudience] = useState<Audience | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAudiences = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = readCache();
      if (cached) {
        setAudiences(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch('/api/content-studio/audiences');
      if (res.ok) {
        const data = await res.json();
        setAudiences(data.audiences ?? []);
        writeCache(data.audiences ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAudiences(); }, [fetchAudiences]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/content-studio/audiences/${id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateCache();
        setAudiences((prev) => prev.filter((a) => a.id !== id));
        setDeleteConfirm(null);
      }
    } catch { /* ignore */ }
  };

  const handleSaved = (a: Audience) => {
    invalidateCache();
    setAudiences((prev) => {
      const exists = prev.find((x) => x.id === a.id);
      if (exists) return prev.map((x) => (x.id === a.id ? a : x));
      return [a, ...prev];
    });
    setModalOpen(false);
    setEditingAudience(null);
  };

  const openCreate = () => {
    setEditingAudience(null);
    setModalOpen(true);
  };

  const openEdit = (a: Audience) => {
    setEditingAudience(a);
    setModalOpen(true);
  };

  const filtered = audiences.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.description ?? '').toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search audiences..."
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.05] pl-9 pr-3 text-[13px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.15] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600,#2455dc)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Audience
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
            {audiences.length === 0 ? 'No audiences found' : 'No matching audiences'}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {audiences.length === 0
              ? 'Create your first audience to get started.'
              : 'Try adjusting your search.'}
          </p>
          {audiences.length === 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600,#2455dc)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create Audience
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-zinc-200">{a.name}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-zinc-400">
                    {a.description ? a.description.slice(0, 80) + (a.description.length > 80 ? '...' : '') : '--'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{a.usage_count}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {deleteConfirm === a.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(a.id)}
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
                          onClick={() => setDeleteConfirm(a.id)}
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

      {/* Modal */}
      {modalOpen && (
        <AudienceModal
          audience={editingAudience}
          onClose={() => { setModalOpen(false); setEditingAudience(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
