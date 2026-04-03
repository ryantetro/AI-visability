'use client';

import { useEffect, useState } from 'react';
import type { ContentGap } from '../lib/types';
import type { AIEngine } from '@/types/ai-mentions';

export function useContentGaps(domain: string) {
  const [gaps, setGaps] = useState<ContentGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const prompts: Array<{ id: string; promptText: string; category: string }> = data.prompts ?? [];
        const results: Array<{ promptId: string; engine: AIEngine; mentioned: boolean }> = data.results ?? [];

        const byPrompt = new Map<string, { mentioned: number; total: number; engines: Set<AIEngine> }>();
        for (const r of results) {
          const existing = byPrompt.get(r.promptId);
          if (existing) {
            existing.total++;
            if (r.mentioned) existing.mentioned++;
            existing.engines.add(r.engine);
          } else {
            byPrompt.set(r.promptId, { mentioned: r.mentioned ? 1 : 0, total: 1, engines: new Set([r.engine]) });
          }
        }

        const contentGaps: ContentGap[] = [];
        for (const p of prompts) {
          const stats = byPrompt.get(p.id);
          if (!stats || stats.total === 0) continue;
          const rate = stats.mentioned / stats.total;
          if (rate < 0.5) {
            const missingEngines = Array.from(stats.engines).filter((eng) => {
              const engResults = results.filter((r) => r.promptId === p.id && r.engine === eng);
              return engResults.every((r) => !r.mentioned);
            });
            contentGaps.push({
              promptText: p.promptText,
              category: p.category,
              engines: missingEngines,
              totalChecks: stats.total,
              mentionRate: rate,
            });
          }
        }

        contentGaps.sort((a, b) => a.mentionRate - b.mentionRate);
        if (!cancelled) setGaps(contentGaps);
      } catch { /* silently fail */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [domain]);

  return { gaps, loading };
}
