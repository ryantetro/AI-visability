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
        {/* Domain header */}
        <div className="flex flex-col items-center gap-1">
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <Globe2 className="h-3.5 w-3.5 text-gray-400" />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-gray-700 hover:text-gray-900 hover:underline"
              >
                {domain}
              </a>
            ) : (
              <span className="text-[13px] font-medium text-gray-700">{domain}</span>
            )}
          </span>
          {dateLabel ? (
            <span className="text-[11px] text-gray-400">{dateLabel}</span>
          ) : null}
        </div>

        {/* Main score ring */}
        <div className="mt-6 flex justify-center">
          <ScoreRing
            score={overall.score}
            size={180}
            emphasis="hero"
            color={overall.color}
            label={overall.label ?? 'Overall Score'}
            caption={overall.caption}
            coreRef={coreRef}
          />
        </div>

        {/* Score band legend */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-medium text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff5252]" />0–59 Needs Work</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff8a1e]" />60–79 Getting There</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#25c972]" />80–100 Strong</span>
        </div>

        {/* Supporting score rings */}
        <div className={cn(
          'mt-6 grid w-full gap-3',
          supporting.length <= 3
            ? 'max-w-[520px] grid-cols-3'
            : 'max-w-[620px] grid-cols-2 sm:grid-cols-4'
        )}>
          {supporting.map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <ScoreRing
                score={item.score}
                size={88}
                emphasis="compact"
                color={item.color}
                label={item.label}
                caption={item.caption}
              />
              {SCORE_TOOLTIPS[item.label] && (
                <InfoTooltip text={SCORE_TOOLTIPS[item.label]} className="mt-1.5" />
              )}
            </div>
          ))}
        </div>

        {note ? (
          <p className="mt-5 max-w-[42rem] text-[13px] leading-6 text-gray-500">
            {note}
          </p>
        ) : null}

        {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
