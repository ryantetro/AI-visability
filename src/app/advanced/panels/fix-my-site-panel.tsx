'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Wrench } from 'lucide-react';
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
  ordered: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-blue-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  refunded: 'bg-gray-100 text-gray-500',
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
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
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
            <label htmlFor="fms-domain" className="mb-1.5 block text-[12px] font-medium text-gray-600">
              Domain
            </label>
            <input
              id="fms-domain"
              type="text"
              value={orderDomain}
              onChange={(e) => setOrderDomain(e.target.value)}
              placeholder="example.com"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium text-gray-600">
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
                      ? 'border-emerald-200 bg-emerald-50 text-gray-900'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700',
                  )}
                >
                  <span className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    selectedFiles.has(opt.value)
                      ? 'border-emerald-300 bg-emerald-100'
                      : 'border-gray-300 bg-transparent',
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
            <label htmlFor="fms-notes" className="mb-1.5 block text-[12px] font-medium text-gray-600">
              Notes <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="fms-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any specific requirements or context for our team..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-500">{error}</p>
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

          <p className="text-center text-[11px] text-gray-500">
            One-time payment. 3-5 business day delivery. Secure checkout via Stripe.
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
            {orders.map(order => (
              <div
                key={order.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{order.domain}</p>
                    <p className="mt-0.5 text-[11px] text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-500',
                  )}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>

                {order.files_requested.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {order.files_requested.map(f => (
                      <span
                        key={f}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                      >
                        {FILE_LABELS[f] ?? f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DashboardPanel>
      )}
    </div>
  );
}
