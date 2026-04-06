'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FEEDBACK_LENGTH = 2000;

const CATEGORIES = [
  { key: 'bug', label: 'Bug Report' },
  { key: 'feature', label: 'Feature Request' },
  { key: 'general', label: 'General' },
] as const;

type Category = (typeof CATEGORIES)[number]['key'];

interface FloatingFeedbackProps {
  bottomClassName?: string;
  compact?: boolean;
  userEmail?: string;
}

export function FloatingFeedback({
  bottomClassName = 'bottom-6',
  compact = false,
  userEmail,
}: FloatingFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const remaining = useMemo(() => MAX_FEEDBACK_LENGTH - message.length, [message.length]);
  const canSend = message.trim().length > 0 && !submitting && !sent;

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleSend = async () => {
    if (!canSend) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          category,
          pageUrl: window.location.href,
        }),
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSubmitting(false);
        setMessage('');
        setCategory('general');
        setOpen(false);
      }, 1800);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('fixed right-6 z-30', bottomClassName)}>
      {open ? (
        <div className="w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.98)_0%,rgba(12,12,13,0.98)_100%)] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-white">Send Feedback</h3>
              <p className="mt-0.5 text-[12px] text-zinc-500">Help us improve your experience</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              aria-label="Close feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Category pills */}
          <div className="mt-5 flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                  category === cat.key
                    ? 'bg-white/[0.12] text-white'
                    : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-300'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="mt-4">
            <textarea
              id="floating-feedback-message"
              value={message}
              maxLength={MAX_FEEDBACK_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your feedback..."
              className="min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] leading-6 text-white placeholder:text-zinc-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-600">
              <span>{message.length} / {MAX_FEEDBACK_LENGTH}</span>
              {remaining < 200 && remaining >= 0 && (
                <span className="text-amber-500/70">{remaining} remaining</span>
              )}
            </div>
          </div>

          {/* Submitting as */}
          {userEmail && (
            <p className="mt-3 text-[11px] text-zinc-600">
              Submitting as <span className="text-zinc-400">{userEmail}</span>
            </p>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.14] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : sent ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Feedback submitted</span>
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#202020] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white',
            compact && 'h-9 gap-1.5 rounded-full bg-[#ececec] px-3 text-[12px] font-medium text-black hover:bg-white hover:text-black'
          )}
        >
          <MessageCircle className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
          Feedback
        </button>
      )}
    </div>
  );
}
