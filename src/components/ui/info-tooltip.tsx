'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({ text, className, iconClassName }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function show() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.bottom + window.scrollY + 6 });
    }
    setOpen(true);
  }

  return (
    <span
      ref={wrapRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        onFocus={show}
        onBlur={() => setOpen(false)}
        className="text-gray-400 transition-colors hover:text-gray-600"
        aria-label="More info"
      >
        <HelpCircle className={cn('h-3 w-3', iconClassName)} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <span
          className="pointer-events-none absolute z-[9999] flex flex-col items-center"
          style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
        >
          {/* Arrow pointing up toward trigger */}
          <span className="h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-gray-800" />
          {/* Tooltip box */}
          <span className="block w-[200px] rounded-lg bg-gray-800 px-3 py-2 text-[11px] leading-relaxed text-gray-100 shadow-xl">
            {text}
          </span>
        </span>,
        document.body
      )}
    </span>
  );
}
