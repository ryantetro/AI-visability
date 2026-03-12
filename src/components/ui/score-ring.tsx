'use client';

import { useScoreAnimation } from '@/hooks/use-score-animation';

interface ScoreRingProps {
  score: number;
  color: string;
  size?: number;
}

export function ScoreRing({ score, color, size = 180 }: ScoreRingProps) {
  const animatedScore = useScoreAnimation(score);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}22 0%, transparent 62%)`,
          filter: 'blur(12px)',
        }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          style={{ stroke: 'var(--border-default)' }}
        />
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
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center rounded-full border"
        style={{
          width: size - 42,
          height: size - 42,
          borderColor: `${color}22`,
          background:
            'linear-gradient(180deg, var(--surface-card) 0%, var(--surface-page) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="text-4xl font-bold tracking-tight" style={{ color }}>
          {animatedScore}
        </span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/ 100</span>
      </div>
    </div>
  );
}
