'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-1 pb-1">{children}</div>}
    </div>
  );
}

export function DashboardPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.96)_0%,rgba(6,6,7,0.985)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.022),0_10px_24px_rgba(0,0,0,0.16)]',
        className
      )}
    >
      {children}
    </section>
  );
}

export function MiniInfoTile({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <p className="mt-2 text-[11px] leading-5 text-zinc-300">{body}</p>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-[13px] leading-6 text-zinc-500">{description}</p>
    </div>
  );
}
