'use client';

import type { Ref } from 'react';
import { useScoreAnimation } from '@/hooks/use-score-animation';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number | null;
  color?: string;
  size?: number;
  label?: string;
  caption?: string;
  emphasis?: 'hero' | 'panel' | 'compact';
  className?: string;
  loading?: boolean;
  loadingText?: string;
  coreRef?: Ref<HTMLDivElement>;
}

export function ScoreRing({
  score,
  color = 'var(--color-primary-500)',
  size = 180,
  label,
  caption,
  emphasis = 'panel',
  className,
  loading = false,
  loadingText = 'Analyzing',
  coreRef,
}: ScoreRingProps) {
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  const animatedScore = useScoreAnimation(safeScore);
  const strokeWidth = emphasis === 'hero' ? 12 : emphasis === 'compact' ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;
  const loadingArc = circumference * 0.26;

  return (
    <div className={cn('relative inline-flex flex-col items-center justify-center gap-3', className)}>
      <div ref={coreRef} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${color}44 0%, transparent 62%)`,
            filter: 'blur(18px)',
            animation: loading ? 'pulse 2.2s ease-in-out infinite' : undefined,
          }}
        />
        <svg width={size} height={size} className={cn('-rotate-90', loading && 'animate-[spin_5s_linear_infinite]')}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            style={{ stroke: 'rgba(131, 160, 255, 0.12)' }}
          />
          {loading ? (
            <>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${loadingArc} ${circumference}`}
                strokeDashoffset={circumference * 0.14}
                style={{ opacity: 0.95 }}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={Math.max(3, strokeWidth - 6)}
                strokeLinecap="round"
                strokeDasharray={`${circumference * 0.08} ${circumference}`}
                strokeDashoffset={circumference * 0.54}
                style={{ opacity: 0.36 }}
              />
            </>
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.16s ease-out' }}
            />
          )}
        </svg>
        <div
          className="absolute flex flex-col items-center justify-center rounded-full border text-center"
          style={{
            width: Math.max(36, size - 40),
            height: Math.max(36, size - 40),
            borderColor: `${color}22`,
            background:
              'linear-gradient(180deg, rgba(16, 25, 43, 0.96) 0%, rgba(8, 14, 26, 0.98) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span
            className="font-display font-bold tracking-[-0.06em]"
            style={{
              color,
              fontSize: loading
                ? size >= 160
                  ? '1rem'
                  : size >= 120
                    ? '0.9rem'
                    : '0.78rem'
                : size >= 160
                  ? '3rem'
                  : size >= 120
                    ? '2.25rem'
                    : size >= 90
                      ? '1.5rem'
                      : '1rem',
              lineHeight: 1,
              letterSpacing: loading ? '0.18em' : undefined,
              textTransform: loading ? 'uppercase' : undefined,
            }}
          >
            {loading ? loadingText : score === null ? '--' : animatedScore}
          </span>
          {loading ? (
            <span
              className="mt-2 text-[0.64rem] font-semibold uppercase tracking-[0.28em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Waiting for score
            </span>
          ) : null}
        </div>
      </div>
      {(label || caption) && (
        <div className="text-center">
          {label ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
              {label}
            </p>
          ) : null}
          {caption ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{caption}</p> : null}
        </div>
      )}
    </div>
  );
}
