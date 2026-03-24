'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({ text, className, iconClassName }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span
      ref={ref}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="More info"
      >
        <HelpCircle className={cn('h-3.5 w-3.5', iconClassName)} />
      </button>
      {open && (
        <span className="absolute left-1/2 top-full z-[60] mt-2 -translate-x-1/2 whitespace-normal">
          <span className="block w-[240px] rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-[11px] leading-[1.6] text-zinc-300 shadow-xl">
            {text}
          </span>
          <span className="mx-auto block h-0 w-0 border-x-[6px] border-b-[6px] border-x-transparent border-b-zinc-900" />
        </span>
      )}
    </span>
  );
}
