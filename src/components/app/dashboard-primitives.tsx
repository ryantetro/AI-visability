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
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-1 pb-1">{children}</div>}
    </div>
  );
}

export function DashboardPanel({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-[1.35rem] border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
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
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">{title}</p>
      <p className="mt-2 text-[11px] leading-5 text-gray-700">{body}</p>
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{eyebrow}</p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-[12px] leading-5 text-gray-500">{description}</p>
    </div>
  );
}
