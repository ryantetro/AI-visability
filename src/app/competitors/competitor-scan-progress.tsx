'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ScanProgressData {
  status: string;
  checks?: Array<{ label: string; status: string }>;
}

interface CompetitorScanProgressProps {
  scanId: string;
  onComplete: () => void;
}

export function CompetitorScanProgress({ scanId, onComplete }: CompetitorScanProgressProps) {
  const [progress, setProgress] = useState<ScanProgressData | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!scanId) return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.progress) {
            setProgress(data.progress);
          }
          if (active && (data.status === 'complete' || data.status === 'failed')) {
            onComplete();
          }
        }
      } catch { /* ignore */ }
    }

    void poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [scanId, onComplete]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const checks = progress?.checks;
  const completedCount = checks?.filter((c) => c.status === 'done').length ?? 0;
  const totalSteps = checks?.length ?? 8;
  const rawPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  // Cap at 95% — only the completion callback should signal "done"
  const cappedPct = Math.min(rawPct, 95);
  // Never let the displayed percentage decrease
  const highWaterRef = useRef(0);
  if (cappedPct > highWaterRef.current) {
    highWaterRef.current = cappedPct;
  }
  const progressPct = highWaterRef.current;
  const currentStep = checks?.find((c) => c.status === 'running');
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-zinc-300">{progressPct}% complete</span>
          <span className="tabular-nums text-zinc-500">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#356df4] to-[#25c972] transition-all duration-700 ease-out"
            style={{ width: `${Math.max(progressPct, 3)}%` }}
          />
        </div>
      </div>

      {/* Compact step list */}
      {currentStep && (
        <div className="flex items-center gap-2 text-[11px]">
          <Loader2 className="h-3 w-3 animate-spin text-[#356df4]" />
          <span className="text-zinc-400">{currentStep.label}</span>
        </div>
      )}
    </div>
  );
}
