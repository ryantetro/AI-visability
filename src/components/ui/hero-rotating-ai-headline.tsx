'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const AI_NAMES = ['ChatGPT', 'Perplexity', 'Gemini', 'Claude', 'Grok'] as const;

const TYPE_MS = 78;
const DELETE_MS = 42;
const PAUSE_FULL_MS = 2200;
const PAUSE_EMPTY_MS = 320;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function HeroRotatingAiHeadline({
  className,
  secondLineClassName,
  style,
}: {
  className?: string;
  secondLineClassName?: string;
  style?: CSSProperties;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [nameIndex, setNameIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(() => AI_NAMES[0].length);
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing');

  const name = AI_NAMES[nameIndex % AI_NAMES.length];
  const visible = name.slice(0, charIndex);

  useEffect(() => {
    if (reducedMotion) return;

    const currentName = AI_NAMES[nameIndex % AI_NAMES.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (charIndex < currentName.length) {
        timeout = setTimeout(() => setCharIndex((c) => c + 1), TYPE_MS);
      } else {
        timeout = setTimeout(() => setPhase('deleting'), PAUSE_FULL_MS);
      }
    } else if (phase === 'deleting') {
      if (charIndex > 0) {
        timeout = setTimeout(() => setCharIndex((c) => c - 1), DELETE_MS);
      } else {
        timeout = setTimeout(() => {
          setNameIndex((i) => (i + 1) % AI_NAMES.length);
          setPhase('typing');
        }, PAUSE_EMPTY_MS);
      }
    }

    return () => clearTimeout(timeout);
  }, [reducedMotion, phase, charIndex, nameIndex]);

  const shellClass = cn(
    'flex flex-col items-center gap-1 text-4xl font-bold tracking-tight sm:gap-1.5 sm:text-5xl lg:gap-1.5 lg:text-6xl text-text-primary leading-[1.06]',
    className,
  );

  if (reducedMotion) {
    return (
      <h1 className={shellClass} style={style}>
        <span className="text-text-primary">
          Can ChatGPT, Perplexity, Gemini &amp; more
        </span>
        <span
          className={cn(
            'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-700)] bg-clip-text text-transparent',
            secondLineClassName,
          )}
        >
          find your business?
        </span>
      </h1>
    );
  }

  return (
    <h1 className={shellClass} style={style}>
      <span className="sr-only">
        See whether AI assistants like ChatGPT, Perplexity, Gemini, Claude, and Grok can find your business.
      </span>
      <span
        aria-hidden="true"
        className="flex flex-wrap items-baseline justify-center text-text-primary"
      >
        <span className="whitespace-pre">Can </span>
        <span className="inline-flex items-baseline whitespace-nowrap">
          <span>{visible}</span>
          <span
            className="hero-type-caret ml-[0.12em] inline-block h-[0.82em] w-[2px] shrink-0 translate-y-[0.04em] bg-[var(--color-primary-400)] motion-reduce:animate-none sm:w-[3px]"
            aria-hidden
          />
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-700)] bg-clip-text text-transparent',
          secondLineClassName,
        )}
      >
        find your business?
      </span>
    </h1>
  );
}
