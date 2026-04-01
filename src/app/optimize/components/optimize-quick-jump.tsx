'use client';

import { CheckSquare, FileText, Globe2, Shield } from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import type { OptimizeTabKey } from '@/lib/optimize/types';

const ITEMS: {
  key: Exclude<OptimizeTabKey, 'overview'>;
  label: string;
  hint: string;
  Icon: typeof FileText;
}[] = [
  { key: 'content', label: 'Content Studio', hint: 'What to publish or rewrite', Icon: FileText },
  { key: 'sources', label: 'Sources', hint: 'Citation and PR targets', Icon: Globe2 },
  { key: 'actions', label: 'Actions', hint: 'Checklist for this week', Icon: CheckSquare },
  { key: 'brand', label: 'Brand Check', hint: 'Narrative you want AI to use', Icon: Shield },
];

export function OptimizeQuickJump({ onSelect }: { onSelect: (tab: OptimizeTabKey) => void }) {
  return (
    <DashboardPanel className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Jump in</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ITEMS.map(({ key, label, hint, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="rounded-xl border border-white/8 bg-white/[0.018] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:border-white/14 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25c972]/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/8 bg-black/25">
              <Icon className="h-4 w-4 text-zinc-300" aria-hidden />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-white">{label}</p>
            <p className="mt-1 text-[12px] leading-snug text-zinc-500">{hint}</p>
          </button>
        ))}
      </div>
    </DashboardPanel>
  );
}
