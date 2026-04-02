'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, Globe, Loader2 } from 'lucide-react';
import { useScoreAnimation } from '@/hooks/use-score-animation';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon } from '@/components/ui/ai-icons';
import { cn } from '@/lib/utils';

const visualEase = [0.22, 1, 0.36, 1] as const;
const viewMargin = '-12% 0px -12% 0px';
const viewAmount = 0.35;

function useVisualInView() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: viewAmount, margin: viewMargin, once: true });
  return { ref, inView };
}

function VisualChrome({
  children,
  className,
  chromeRef,
}: {
  children: ReactNode;
  className?: string;
  chromeRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={chromeRef}
      className={cn(
        'relative min-h-[168px] overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-b from-gray-50/90 to-white',
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

/** Card 1 — ring + segments fire when scrolled into view; subtle “alive” loops while visible. */
export function PillarVisualVisibility() {
  const reduce = useReducedMotion();
  const { ref, inView } = useVisualInView();
  const target = inView ? 82 : 0;
  const score = useScoreAnimation(reduce ? 82 : target, reduce || !inView ? 0 : 1650);

  const sw = 3;
  const size = 76;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  const segments = 10;
  const filled = Math.round((score / 100) * segments);

  return (
    <VisualChrome chromeRef={ref}>
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {!reduce && inView ? (
              <motion.div
                className="pointer-events-none absolute inset-[-10px] rounded-full bg-emerald-400/25 blur-xl"
                animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.92, 1.05, 0.92] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : null}
            <svg width={size} height={size} className="relative -rotate-90 shrink-0">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} className="stroke-gray-200" />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={sw}
                strokeLinecap="round"
                className="stroke-emerald-500"
                strokeDasharray={c}
                initial={false}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: reduce ? 0 : 1.55, ease: visualEase }}
              />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">{reduce ? 82 : score}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">AI visibility</p>
          </div>
        </div>
        <div className="flex w-full max-w-[200px] gap-1">
          {Array.from({ length: segments }).map((_, i) => {
            const isOn = i < filled;
            return (
              <motion.span
                key={i}
                className={cn('h-2 flex-1 rounded-sm', isOn ? 'bg-emerald-500' : 'bg-gray-200')}
                initial={false}
                animate={
                  reduce
                    ? {}
                    : {
                        scaleY: isOn ? [1, 1.25, 1] : 1,
                        opacity: isOn ? [1, 0.85, 1] : 0.55,
                      }
                }
                transition={{
                  duration: isOn ? 2.4 : 0,
                  repeat: isOn ? Infinity : 0,
                  ease: 'easeInOut',
                  delay: isOn ? i * 0.12 : 0,
                }}
              />
            );
          })}
        </div>
        <motion.p
          className="text-center text-[10px] font-medium text-gray-500"
          animate={reduce || !inView ? {} : { opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          6 dimensions · live audit
        </motion.p>
      </div>
    </VisualChrome>
  );
}

const TRACKED_PROMPT_DECK = [
  {
    snippet: 'Best AI visibility tools for SMB…',
    source: 'ChatGPT',
    progress: 0.78,
    fill: 'bg-emerald-500',
    muted: 'bg-emerald-200/80',
  },
  {
    snippet: 'Who recommends our brand for local services?',
    source: 'Perplexity',
    progress: 0.62,
    fill: 'bg-sky-500',
    muted: 'bg-sky-200/80',
  },
  {
    snippet: 'Competitor mentions vs us this week',
    source: 'Claude',
    progress: 0.45,
    fill: 'bg-orange-500',
    muted: 'bg-orange-200/80',
  },
  {
    snippet: 'Summarize what Gemini knows about our pricing',
    source: 'Gemini',
    progress: 0.88,
    fill: 'bg-blue-500',
    muted: 'bg-blue-200/80',
  },
  {
    snippet: 'Brand sentiment when users ask for alternatives',
    source: 'Multi-model',
    progress: 0.34,
    fill: 'bg-violet-500',
    muted: 'bg-violet-200/80',
  },
] as const;

const CAROUSEL_SLOTS: readonly {
  topPx: number;
  scale: number;
  opacity: number;
  z: number;
  shadow: string;
}[] = [
  { topPx: 0, scale: 0.86, opacity: 0.42, z: 1, shadow: '0 2px 8px rgba(15,23,42,0.06)' },
  { topPx: 12, scale: 0.9, opacity: 0.55, z: 2, shadow: '0 4px 12px rgba(15,23,42,0.07)' },
  { topPx: 28, scale: 1, opacity: 1, z: 10, shadow: '0 14px 36px rgba(15,23,42,0.14)' },
  { topPx: 50, scale: 0.92, opacity: 0.72, z: 5, shadow: '0 6px 16px rgba(15,23,42,0.1)' },
  { topPx: 68, scale: 0.88, opacity: 0.52, z: 3, shadow: '0 4px 12px rgba(15,23,42,0.08)' },
];

function PromptSegmentedBar({
  progress,
  fill,
  muted,
  animate,
  reduce,
}: {
  progress: number;
  fill: string;
  muted: string;
  animate: boolean;
  reduce: boolean;
}) {
  const total = 14;
  const filled = Math.round(progress * total);
  return (
    <div className="mt-2 flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          className={cn('h-1.5 min-w-0 flex-1 rounded-[2px]', i < filled ? fill : muted)}
          initial={false}
          animate={
            animate && !reduce && i < filled
              ? { opacity: [0.45, 1, 0.85], scaleY: [0.65, 1, 0.9] }
              : {}
          }
          transition={{
            duration: 1.8,
            repeat: animate && !reduce ? Infinity : 0,
            ease: 'easeInOut',
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

/** Card 2 — vertical “deck” cycles prompts; center card is in focus (automate-tasks style). */
export function PillarVisualPrompts() {
  const reduce = useReducedMotion();
  const { ref, inView } = useVisualInView();
  const [active, setActive] = useState(0);
  const n = TRACKED_PROMPT_DECK.length;

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % n), 3400);
    return () => clearInterval(id);
  }, [inView, reduce, n]);

  const models = [
    { I: ChatGPTIcon, c: 'text-[#74aa9c]' },
    { I: PerplexityIcon, c: 'text-[#20B8CD]' },
    { I: GeminiIcon, c: 'text-[#4285F4]' },
    { I: ClaudeIcon, c: 'text-[#d97757]' },
  ] as const;

  return (
    <VisualChrome chromeRef={ref}>
      <div className="flex h-full flex-col px-3 pb-4 pt-3">
        <div className="mb-2 flex justify-center gap-2">
          {models.map(({ I, c }, i) => (
            <motion.span
              key={i}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm',
                c,
              )}
              initial={false}
              animate={
                inView
                  ? { opacity: 1, y: 0, scale: reduce ? 1 : [1, 1.06, 1] }
                  : { opacity: 0.4, y: 8, scale: 0.92 }
              }
              transition={{
                delay: reduce ? 0 : 0.06 * i,
                duration: 0.45,
                ease: visualEase,
                scale: reduce ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 },
              }}
            >
              <I className="h-3.5 w-3.5" />
            </motion.span>
          ))}
        </div>

        <div className="relative mx-auto h-[118px] w-full max-w-[218px] overflow-visible">
          {TRACKED_PROMPT_DECK.map((card, i) => {
            const d = (i - active + n) % n;
            const slot = CAROUSEL_SLOTS[d] ?? CAROUSEL_SLOTS[2];
            const isFocus = d === 0;

            return (
              <motion.div
                key={i}
                className={cn(
                  'absolute left-0 right-0 origin-top rounded-lg border bg-white px-2.5 py-2',
                  isFocus ? 'border-[var(--color-primary-200)]' : 'border-gray-200/90',
                )}
                style={{ transformOrigin: '50% 0%' }}
                initial={false}
                animate={{
                  top: slot.topPx,
                  scale: slot.scale,
                  opacity: slot.opacity,
                  zIndex: slot.z,
                  boxShadow: slot.shadow,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="mb-1 flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  </div>
                  {isFocus ? (
                    <Loader2
                      className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--color-primary-500)]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} aria-hidden />
                  )}
                </div>
                <p className="text-[10px] font-semibold text-gray-900">Tracked prompt</p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-gray-600">{card.snippet}</p>
                <PromptSegmentedBar
                  progress={card.progress}
                  fill={card.fill}
                  muted={card.muted}
                  animate={Boolean(isFocus && inView)}
                  reduce={Boolean(reduce)}
                />
                <p className="mt-1.5 text-[8px] font-medium text-gray-400">
                  {isFocus ? 'Tracking · ' : 'Updated · '}
                  {card.source}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </VisualChrome>
  );
}

const ROBOTS_LINES = ['User-agent: GPTBot', 'Allow: /'] as const;
const LLMS_LINES = ['# airadr', 'Summary: Your crawl-backed spec'] as const;

/** Card 3 — tabs cycle; lines type in when active (alive editor). */
export function PillarVisualFixes() {
  const reduce = useReducedMotion();
  const { ref, inView } = useVisualInView();
  const [tab, setTab] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setTab((t) => (t + 1) % 2), 3200);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const lines = tab === 0 ? ROBOTS_LINES : LLMS_LINES;
  const primaryLine = lines[0] ?? '';

  useEffect(() => {
    if (!inView || reduce) {
      setTyped(primaryLine);
      return;
    }
    setTyped('');
    let cancelled = false;
    let i = 0;
    let timeoutId: number | undefined;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setTyped(primaryLine.slice(0, i));
      if (i < primaryLine.length) {
        timeoutId = window.setTimeout(tick, 36);
      }
    };
    timeoutId = window.setTimeout(tick, 100);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [inView, reduce, tab, primaryLine]);

  return (
    <VisualChrome className="border-gray-700/50 bg-gray-950" chromeRef={ref}>
      <div className="flex h-full flex-col text-left">
        <div className="flex gap-0.5 border-b border-white/10 px-2 pt-2">
          <motion.span
            className={cn(
              'rounded-t-md px-2 py-1 text-[9px] font-semibold transition-colors',
              tab === 0 ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500',
            )}
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            robots.txt
          </motion.span>
          <motion.span
            className={cn(
              'rounded-t-md px-2 py-1 text-[9px] font-semibold transition-colors',
              tab === 1 ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500',
            )}
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            llms.txt
          </motion.span>
        </div>
        <div className="min-h-[72px] space-y-1.5 p-3 font-mono text-[9px] leading-relaxed">
          <p className="text-emerald-400/90">
            {typed}
            {!reduce && inView && typed.length < primaryLine.length ? (
              <motion.span
                className="ml-0.5 inline-block h-3 w-px bg-emerald-400 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.75, repeat: Infinity }}
              />
            ) : null}
          </p>
          {lines[1] ? (
            <motion.p
              key={lines[1]}
              className="text-gray-500"
              initial={false}
              animate={{ opacity: inView ? 1 : 0.4, x: inView ? 0 : -4 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              {lines[1]}
            </motion.p>
          ) : null}
          <motion.div
            className="mt-2 flex items-center gap-1.5 text-emerald-400"
            animate={reduce || !inView ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.span
              animate={reduce || !inView ? {} : { rotate: [0, 8, -6, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
            </motion.span>
            <span>Generated from your crawl</span>
          </motion.div>
        </div>
      </div>
    </VisualChrome>
  );
}

/** Card 4 — lines pulse; dots travel inward toward the site hub. */
export function PillarVisualCrawler() {
  const reduce = useReducedMotion();
  const { ref, inView } = useVisualInView();
  const cx = 110;
  const cy = 72;
  const nodes: { x: number; y: number; Icon: typeof ChatGPTIcon; className: string }[] = [
    { x: 110, y: 18, Icon: ChatGPTIcon, className: 'text-[#74aa9c]' },
    { x: 188, y: 72, Icon: PerplexityIcon, className: 'text-[#20B8CD]' },
    { x: 110, y: 126, Icon: GeminiIcon, className: 'text-[#4285F4]' },
    { x: 32, y: 72, Icon: ClaudeIcon, className: 'text-[#d97757]' },
  ];

  return (
    <VisualChrome chromeRef={ref}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 220 144" fill="none" aria-hidden>
        {nodes.map((n, i) => (
          <motion.line
            key={`ln-${i}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke="rgb(229 231 235)"
            strokeWidth="1"
            strokeLinecap="round"
            initial={false}
            animate={
              inView
                ? {
                    pathLength: 1,
                    opacity: reduce ? 1 : [0.45, 0.95, 0.45],
                  }
                : { pathLength: 0.3, opacity: 0.35 }
            }
            transition={{
              pathLength: { duration: reduce ? 0 : 1.05, delay: reduce ? 0 : 0.1 * i, ease: visualEase },
              opacity: { duration: 2.6, repeat: reduce ? 0 : Infinity, ease: 'easeInOut', delay: i * 0.2 },
            }}
          />
        ))}
      </svg>
      <div className="relative flex h-full items-center justify-center py-4">
        <div className="relative" style={{ width: 220, height: 144 }}>
          {inView && !reduce
            ? nodes.map((n, i) => (
                <motion.div
                  key={`pulse-${i}`}
                  className="pointer-events-none absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary-500)] shadow-[0_0_10px_rgba(53,109,244,0.55)]"
                  style={{ left: n.x, top: n.y }}
                  animate={{
                    x: [0, cx - n.x],
                    y: [0, cy - n.y],
                    opacity: [0.2, 1, 0],
                    scale: [0.6, 1, 0.5],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: visualEase,
                    delay: i * 0.45,
                  }}
                />
              ))
            : null}
          <motion.div
            className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-[var(--color-primary-200)] bg-white shadow-lg"
            initial={false}
            animate={
              inView
                ? {
                    scale: reduce ? 1 : [1, 1.06, 1],
                    boxShadow: reduce
                      ? '0 10px 25px rgba(15,23,42,0.12)'
                      : [
                          '0 10px 25px rgba(15,23,42,0.12)',
                          '0 12px 32px rgba(53,109,244,0.22)',
                          '0 10px 25px rgba(15,23,42,0.12)',
                        ],
                  }
                : { scale: 0.92 }
            }
            transition={{
              scale: { duration: reduce ? 0 : 2.4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' },
              boxShadow: { duration: reduce ? 0 : 2.4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' },
            }}
          >
            <motion.span
              animate={reduce || !inView ? {} : { rotate: [0, 6, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Globe className="h-5 w-5 text-[var(--color-primary-600)]" strokeWidth={2} />
            </motion.span>
          </motion.div>
          {nodes.map((n, i) => (
            <motion.span
              key={i}
              className={cn(
                'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm',
                n.className,
              )}
              style={{ left: n.x, top: n.y }}
              initial={false}
              animate={
                inView
                  ? {
                      opacity: 1,
                      scale: reduce ? 1 : [1, 1.06, 1],
                    }
                  : { opacity: 0.5, scale: 0.88 }
              }
              transition={{
                delay: reduce ? 0 : 0.2 + i * 0.08,
                duration: 0.45,
                scale: { duration: 2.2, repeat: reduce ? 0 : Infinity, ease: 'easeInOut', delay: i * 0.22 },
              }}
            >
              <n.Icon className="h-4 w-4" />
            </motion.span>
          ))}
        </div>
      </div>
      <motion.p
        className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-medium text-gray-500"
        animate={reduce || !inView ? {} : { opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        Bots · referrals · visits
      </motion.p>
    </VisualChrome>
  );
}
