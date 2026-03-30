'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { scoreColor } from '../lib/utils';
import { getFaviconUrl } from '@/lib/url-utils';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import type { AIEngine } from '@/types/ai-mentions';

export function CenteredLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

export function CenteredWorkspaceState({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className={cn(
      'flex min-h-[180px] items-center justify-center rounded-[1.2rem] border px-6 py-10 text-center text-sm',
      tone === 'error'
        ? 'border-red-500/20 bg-red-500/8 text-red-300'
        : 'border-white/8 bg-white/[0.02] text-zinc-400'
    )}>
      {label}
    </div>
  );
}

export function MetricPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', scoreColor(value))}>{value == null ? '--' : `${Math.round(value)}`}</p>
    </div>
  );
}

export function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-white">{Math.round(payload[0].value)}%</p>
    </div>
  );
}

/* ── Engine Icon ────────────────────────────────────────────────────────── */

const ENGINE_ICON_MAP: Record<AIEngine, React.ComponentType<{ className?: string }>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
  grok: GrokIcon,
};

const ENGINE_ICON_COLORS = Object.fromEntries(
  Object.entries(AI_ENGINE_META).map(([engine, meta]) => [engine, meta.color])
) as Record<AIEngine, string>;

export function EngineIcon({ engine, className, style }: { engine: string; className?: string; style?: React.CSSProperties }) {
  const normalized = engine.toLowerCase() as AIEngine;
  const Icon = ENGINE_ICON_MAP[normalized];
  if (Icon) return <span style={style}><Icon className={className ?? 'size-4'} /></span>;
  // Fallback: colored circle with first letter
  const color = ENGINE_ICON_COLORS[normalized] ?? '#71717a';
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full text-[8px] font-bold text-white', className ?? 'size-4')}
      style={{ backgroundColor: color, ...style }}
    >
      {engine.charAt(0).toUpperCase()}
    </span>
  );
}

/* ── Brand Favicon ──────────────────────────────────────────────────────── */

function brandAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

export function BrandFavicon({ name, size = 20 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const domain = name.includes('.') ? name : `${name}.com`;

  if (failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ width: size, height: size, backgroundColor: brandAvatarColor(name) }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={getFaviconUrl(domain, size)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  );
}
