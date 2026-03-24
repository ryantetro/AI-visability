'use client';

import type { Ref } from 'react';
import { ReactNode } from 'react';
import { Globe2, Zap } from 'lucide-react';
import { ScoreRing } from '@/components/ui/score-ring';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

const SCORE_TOOLTIPS: Record<string, string> = {
  'Overall Score': 'Combined score based on AI discoverability, website quality, trust & security, and AI mentions. Higher = more likely to be recommended by AI.',
  'Website Quality': 'How well your site follows web standards — meta tags, Open Graph, structured data, and heading structure.',
  'Trust & Security': 'HTTPS, security headers, and content security policies that signal trustworthiness to AI systems.',
  'PageSpeed': 'Core Web Vitals and load performance. Faster sites tend to rank better in both traditional and AI search.',
  'AI Mentions': 'How often AI engines like ChatGPT and Perplexity mention your brand when asked relevant questions.',
};

interface ScoreSummaryHeroProps {
  domain: string;
  url?: string;
  dateLabel?: string;
  coreRef?: Ref<HTMLDivElement>;
  overall: {
    score: number | null;
    color: string;
    label?: string;
    caption?: string;
  };
  supporting: Array<{
    label: string;
    score: number | null;
    color: string;
    caption?: string;
  }>;
  note?: string;
  actions?: ReactNode;
  className?: string;
}

export function ScoreSummaryHero({
  domain,
  url,
  dateLabel,
  coreRef,
  overall,
  supporting,
  note,
  actions,
  className,
}: ScoreSummaryHeroProps) {
  return (
    <section className={cn('px-2 py-6 sm:py-8', className)}>
      <div className="flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-1.5">
          <span className="inline-flex items-center gap-2 text-zinc-400">
            <Zap className="h-4 w-4 text-amber-400/90" />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-white hover:text-zinc-200"
              >
                {domain}
              </a>
            ) : (
              <span className="font-medium text-white">{domain}</span>
            )}
          </span>
          {dateLabel ? (
            <span className="text-[12px] text-zinc-500">{dateLabel}</span>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <ScoreRing
            score={overall.score}
            size={188}
            emphasis="hero"
            color={overall.color}
            label={overall.label ?? 'Overall Score'}
            caption={overall.caption}
            coreRef={coreRef}
          />
        </div>

        {/* Score band legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-medium">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff5252]" />0–59 Needs Work</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff8a1e]" />60–79 Getting There</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#25c972]" />80–100 Strong</span>
        </div>

        <div className={cn(
          'mt-8 grid w-full gap-4',
          supporting.length <= 3
            ? 'max-w-[560px] grid-cols-3'
            : 'max-w-[680px] grid-cols-2 sm:grid-cols-4'
        )}>
          {supporting.map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <ScoreRing
                score={item.score}
                size={100}
                emphasis="compact"
                color={item.color}
                label={item.label}
                caption={item.caption}
              />
              {SCORE_TOOLTIPS[item.label] && (
                <InfoTooltip text={SCORE_TOOLTIPS[item.label]} className="mt-1" />
              )}
            </div>
          ))}
        </div>

        {note ? (
          <p className="mt-6 max-w-[42rem] text-[13px] leading-6 text-zinc-500">
            {note}
          </p>
        ) : null}

        {actions ? <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
