import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptCopyPanelProps {
  title: string;
  description: string;
  actionLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
  meta?: string;
}

export function PromptCopyPanel({
  title,
  description,
  actionLabel,
  copiedLabel,
  copied,
  onCopy,
  meta,
}: PromptCopyPanelProps) {
  return (
    <div className="aiso-card p-6">
      <p className="aiso-kicker">Prompt Toolkit</p>
      <h3 className="mt-3 font-display text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      {meta ? <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{meta}</p> : null}
      <button
        type="button"
        onClick={onCopy}
        className={cn('aiso-button mt-5 w-full px-4 py-3 text-sm', copied ? 'aiso-button-secondary' : 'aiso-button-primary')}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? copiedLabel : actionLabel}
      </button>
    </div>
  );
}
