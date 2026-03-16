'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FEEDBACK_LENGTH = 1000;

interface FloatingFeedbackProps {
  bottomClassName?: string;
  compact?: boolean;
  userName?: string;
}

export function FloatingFeedback({
  bottomClassName = 'bottom-6',
  compact = false,
  userName = 'Ryan',
}: FloatingFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const remaining = useMemo(() => MAX_FEEDBACK_LENGTH - message.length, [message.length]);
  const canSend = message.trim().length > 0;

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

  const handleSend = () => {
    if (!canSend) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
      setOpen(false);
    }, 1200);
  };

  return (
    <div className={cn('fixed right-6 z-30', bottomClassName)}>
      {open ? (
        <div className="w-[min(92vw,430px)] rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.98)_0%,rgba(12,12,13,0.98)_100%)] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[2rem] font-semibold tracking-[-0.04em] text-white">Feedback</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              aria-label="Close feedback"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[1rem] font-semibold text-white sm:text-[1.05rem]">
              Hey {userName}! <span aria-hidden>👋</span>
            </p>
            <p className="mx-auto mt-3 max-w-[18rem] text-[14px] leading-7 text-zinc-400">
              I&apos;d love to hear your thoughts and suggestions
            </p>
          </div>

          <div className="mt-8">
            <label htmlFor="floating-feedback-message" className="text-[14px] font-semibold text-white">
              What&apos;s on your mind?
            </label>
            <textarea
              id="floating-feedback-message"
              value={message}
              maxLength={MAX_FEEDBACK_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell me what you think... What can I improve? What do you love? Any bugs you found?"
              className="mt-3 min-h-[140px] w-full resize-none rounded-[1rem] border border-white/10 bg-white/[0.045] px-4 py-3 text-[14px] leading-7 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            <div className="mt-2 text-[12px] text-zinc-500">
              {message.length} / {MAX_FEEDBACK_LENGTH}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sent}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1rem] bg-[#e7e7e8] px-5 text-[1.05rem] font-semibold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4.5 w-4.5" />
            {sent ? 'Sent. Thank you.' : 'Send it!'}
          </button>

          <p className="mt-6 text-center text-[12px] leading-6 text-zinc-500">
            Made with <span className="text-[#5f93ff]">♥</span> by Ryan • Every feedback matters to me
          </p>
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
