'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Lock } from 'lucide-react';
import { usePlan } from '@/hooks/use-plan';
import { FEATURE_GATES, type PlanTier } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const TIER_ORDER: Record<PlanTier, number> = { free: 0, starter: 1, pro: 2, growth: 3 };

function canAccess(userTier: PlanTier, requiredTier: PlanTier): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];
}

interface ExportButtonProps {
  /** The export type param sent to /api/export */
  exportType: 'scans' | 'prompts' | 'crawler-visits' | 'referral-visits';
  /** Domain to export data for */
  domain: string;
  /** Optional days param for crawler/referral exports */
  days?: number;
  /** Feature gate key from FEATURE_GATES */
  featureGate: string;
  /** Override button styling */
  className?: string;
}

export function ExportButton({
  exportType,
  domain,
  days,
  featureGate,
  className,
}: ExportButtonProps) {
  const { tier } = usePlan();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const requiredTier = FEATURE_GATES[featureGate] ?? 'pro';
  const hasAccess = canAccess(tier, requiredTier);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleExport = async (format: 'csv' | 'json') => {
    setOpen(false);
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        type: exportType,
        domain,
        format,
      });
      if (days) params.set('days', String(days));

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        alert(err.error || 'Export failed');
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!hasAccess) {
    return (
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-500 cursor-not-allowed',
          className,
        )}
        title={`Requires ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan`}
        disabled
      >
        <Lock className="h-3 w-3" />
        Export
      </button>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={downloading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-50',
          className,
        )}
      >
        <Download className="h-3 w-3" />
        {downloading ? 'Exporting...' : 'Export'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            JSON
          </button>
        </div>
      )}
    </div>
  );
}
