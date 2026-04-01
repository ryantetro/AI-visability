import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUMMARY_CLASSES =
  'flex w-full cursor-pointer select-none list-none items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden';

/**
 * Optional tips — closed by default so pages stay easy to scan.
 */
export function OptimizeTabGuide({
  summary = 'Tips',
  steps,
  className,
}: {
  summary?: string;
  steps: string[];
  className?: string;
}) {
  return (
    <details
      className={cn(
        'group rounded-xl border border-white/8 bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        className,
      )}
    >
      <summary className={SUMMARY_CLASSES}>
        <span className="text-[13px] font-medium text-zinc-200">{summary}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="space-y-2 border-t border-white/8 px-3 py-3 text-[13px] leading-snug text-zinc-400">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" aria-hidden />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
