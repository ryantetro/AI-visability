'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Code2,
  FileJson2,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface KeepDoingColumnProps {
  monitoringConnected: boolean;
  trackingReady: boolean;
  hasStructuredDataFixes: boolean;
  tier: string;
  maxCompetitors: number;
}

interface ActionItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  description: string;
  href: string;
  highlight?: boolean;
}

export function KeepDoingColumn({
  monitoringConnected,
  trackingReady,
  hasStructuredDataFixes,
  tier,
  maxCompetitors,
}: KeepDoingColumnProps) {
  const items: ActionItem[] = [];

  // 1. Always shown, visually prominent
  items.push({
    key: 'articles',
    icon: Sparkles,
    iconColor: '#ffbb00',
    label: 'Get AI-optimized articles',
    description: 'Content designed to boost your AI engine rankings',
    href: '/fix-my-site',
    highlight: true,
  });

  // 2. Enable monitoring (if not connected)
  if (!monitoringConnected) {
    items.push({
      key: 'monitoring',
      icon: BarChart3,
      iconColor: '#25c972',
      label: 'Monitor rankings weekly',
      description: 'Track how AI engines rank your brand over time',
      href: '/dashboard#monitoring',
    });
  }

  // 3. Structured data (if fixes exist)
  if (hasStructuredDataFixes) {
    items.push({
      key: 'structured-data',
      icon: FileJson2,
      iconColor: '#3b82f6',
      label: 'Add structured data',
      description: 'Help AI engines understand your business identity',
      href: '/report',
    });
  }

  // 4. Install tracking (if not installed)
  if (!trackingReady) {
    items.push({
      key: 'tracking',
      icon: Code2,
      iconColor: '#a855f7',
      label: 'Install AI bot tracking',
      description: 'See which AI crawlers visit your site',
      href: '/dashboard#tracking',
    });
  }

  // 5. Track competitors (if tier allows)
  if (maxCompetitors > 0) {
    items.push({
      key: 'competitors',
      icon: Users,
      iconColor: '#ff8a1e',
      label: 'Track your competitors',
      description: 'Compare AI visibility scores side-by-side',
      href: '/competitors',
    });
  }

  return (
    <div className="flex-1 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Keep Doing
      </p>

      <div className="mt-3 space-y-2">
        {items.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={(e) => {
                const hash = item.href.split('#')[1];
                if (hash) {
                  const el = document.getElementById(hash);
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                item.highlight
                  ? 'border-[#ffbb00]/15 bg-[#ffbb00]/[0.04] hover:border-[#ffbb00]/25 hover:bg-[#ffbb00]/[0.07]'
                  : 'border-white/5 bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]'
              )}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${item.iconColor}15`, color: item.iconColor }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  'truncate text-[12px] font-medium',
                  item.highlight ? 'text-white' : 'text-zinc-200'
                )}>
                  {item.label}
                </p>
                <p className="truncate text-[10px] text-zinc-500">{item.description}</p>
              </div>
              <ArrowRight className="h-3 w-3 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
