'use client';

import { useScoreAnimation } from '@/hooks/use-score-animation';

/* ── Mini circular gauge for the metrics row ── */
export function MiniGauge({ value, color, size = 48 }: { value: number; color: string; size?: number }) {
  const animated = useScoreAnimation(Math.max(0, Math.min(100, value)));
  const sw = 4;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} stroke="rgba(255,255,255,0.06)" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  );
}

/* ── Engine circular progress ring ── */
export function EngineRing({ ratio, color, size = 56 }: { ratio: number; color: string; size?: number }) {
  const pct = Math.max(0, Math.min(100, ratio));
  const animated = useScoreAnimation(pct);
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} stroke="rgba(255,255,255,0.06)" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {animated}%
      </span>
    </div>
  );
}

/* ── Horizontal pillar bar ── */
export function PillarBar({ value, color, label, max = 100 }: { value: number; color: string; label: string; max?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const animated = useScoreAnimation(pct);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{animated}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${animated}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            transition: 'width 1s ease-out',
            boxShadow: `0 0 12px ${color}44`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Animated counter number ── */
export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const animated = useScoreAnimation(value);
  return <>{animated}{suffix}</>;
}
