'use client';

interface ProgressRingProps {
  complete: number;
  total: number;
  size?: number;
}

export function ProgressRing({ complete, total, size = 80 }: ProgressRingProps) {
  const pct = total > 0 ? (complete / total) * 100 : 0;
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={6}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="#25c972"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-500 ease-out"
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-[16px] font-bold"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
