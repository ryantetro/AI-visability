'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Copy, HelpCircle, Info, Lock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { CheckFixContent } from '@/lib/analysis-fix-content';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { AI_ENGINE_META } from '@/lib/ai-engines';

export type EngineKey = 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'grok';

export type VerdictQuality = 'strong' | 'normal' | 'low';

export interface CheckItem {
  label: string;
  detail?: string;
  verdict?: 'pass' | 'fail' | 'unknown';
  /** Quality tier for pass verdicts: strong (>=50%), normal (>=25%), low (<25%) */
  verdictQuality?: VerdictQuality;
  points?: number;
  maxPoints?: number;
  fixContent?: CheckFixContent;
  /** When set, renders the AI platform icon instead of the verdict icon */
  engineKey?: EngineKey;
  /** Optional React element rendered above fixContent (e.g. social card preview) */
  previewWidget?: React.ReactNode;
}

const ENGINE_ICONS: Record<EngineKey, React.ComponentType<{ className?: string }>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
  grok: GrokIcon,
};

export interface SubSection {
  label: string;
  checks: CheckItem[];
}

interface YwsBreakdownSectionProps {
  title: string;
  score: number | null;
  maxScore?: number;
  scoreColor: string;
  onCopyToLlm?: () => void;
  copied?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  passCount?: number;
  failCount?: number;
  unknownCount?: number;
  checks: CheckItem[];
  subSections?: SubSection[];
  defaultExpanded?: boolean;
  showClickHint?: boolean;
  /** When false, all checks show as Locked until upgrade. When true, show full check details. */
  hasPaid?: boolean;
  /** Help text shown in an info tooltip next to the section title */
  tooltip?: string;
  /** Optional upgrade handler for locked checks */
  onLockedClick?: () => void;
}

export function YwsBreakdownSection({
  title,
  score,
  maxScore = 100,
  scoreColor,
  onCopyToLlm,
  copied = false,
  copyLabel = 'Copy to LLM',
  copiedLabel = 'Copied',
  passCount = 0,
  failCount = 0,
  unknownCount = 0,
  checks,
  subSections,
  defaultExpanded = false,
  showClickHint = false,
  hasPaid = false,
  tooltip,
  onLockedClick,
}: YwsBreakdownSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const displayScore = score !== null ? score : 0;
  const sections = subSections ?? [{ label: '', checks }];

  return (
    <div className={cn('relative', showClickHint && 'pt-8')}>
      {showClickHint && (
        <div className="absolute right-0 top-0 z-10 flex items-center gap-1.5 text-[11px] font-normal text-zinc-400">
          <span>👇</span>
          Click to open / close
        </div>
      )}

      <section className="overflow-visible rounded-xl border border-white/[0.06] bg-[#0f0f0f]">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-white/[0.02] sm:gap-8"
        >
          {/* Left: Title + Score */}
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-white">
              {title}
              {tooltip && <InfoTooltip text={tooltip} className="ml-1.5 align-middle" />}
              {' '}
              <span style={{ color: scoreColor }} className="tabular-nums">{displayScore}</span>
              <span className="text-[13px] font-normal text-zinc-500 tabular-nums">/{maxScore}</span>
            </h3>
          </div>

          {/* Center: Copy to LLM + Indicators */}
          <div className="flex shrink-0 items-center gap-6 sm:gap-8">
            {onCopyToLlm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyToLlm();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? copiedLabel : copyLabel}
              </button>
            )}
            <div className="flex items-center gap-5 text-[12px] text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {passCount}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {unknownCount}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {failCount}
              </span>
            </div>
          </div>

          {/* Right: Expand chevron */}
          <div className="flex shrink-0 pl-2">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-white/[0.06] px-6 py-5">
            {sections.map((section) => (
              <div key={section.label || 'main'} className={section.label ? 'mt-8 first:mt-0' : ''}>
                {section.label && (
                  <h4 className="mb-3 text-[13px] font-semibold text-white">{section.label}</h4>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.checks.map((check, index) => (
                    <CheckCard
                      key={`${section.label || 'main'}-${check.label}-${index}`}
                      check={check}
                      locked={!hasPaid}
                      onLockedClick={onLockedClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const ENGINE_ICON_COLORS: Record<EngineKey, string> = {
  chatgpt: AI_ENGINE_META.chatgpt.color,
  perplexity: AI_ENGINE_META.perplexity.color,
  gemini: AI_ENGINE_META.gemini.color,
  claude: AI_ENGINE_META.claude.color,
  grok: AI_ENGINE_META.grok.color,
};

function CheckCard({
  check,
  locked = false,
  onLockedClick,
}: {
  check: CheckItem;
  locked?: boolean;
  onLockedClick?: () => void;
}) {
  const hasData = !locked && check.detail !== undefined && check.verdict !== undefined;
  const EngineIcon = check.engineKey ? ENGINE_ICONS[check.engineKey] : null;

  if (hasData) {
    const verdictStyles = {
      pass: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', Icon: CheckCircle2 },
      fail: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', Icon: XCircle },
      unknown: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', Icon: HelpCircle },
    };

    // Quality-tiered pass styling
    const getPassStyle = (quality?: VerdictQuality) => {
      if (quality === 'low') return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', Icon: CheckCircle2 };
      if (quality === 'strong') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', Icon: CheckCircle2 };
      return verdictStyles.pass;
    };

    const style = check.verdict === 'pass' && check.verdictQuality
      ? getPassStyle(check.verdictQuality)
      : verdictStyles[check.verdict!];
    const VerdictIcon = style.Icon;

    // Display label for the verdict badge
    const verdictLabel = check.verdict === 'pass' && check.verdictQuality === 'low'
      ? 'low pass'
      : check.verdict === 'pass' && check.verdictQuality === 'strong'
        ? 'strong pass'
        : check.verdict;

    const fixContent = check.fixContent;

    return (
      <div
        className={cn(
          'rounded-lg border p-4',
          style.border,
          style.bg,
          'bg-white/[0.02]'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {EngineIcon ? (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ color: ENGINE_ICON_COLORS[check.engineKey!] }}
                >
                  <EngineIcon className="h-5 w-5" />
                </span>
              ) : (
                <VerdictIcon className={cn('h-4 w-4 shrink-0', style.text)} />
              )}
              <p className="font-medium text-white">{check.label}</p>
            </div>
            <p className="mt-1 text-xs leading-6 text-zinc-400">{check.detail}</p>
            {check.points !== undefined && check.maxPoints !== undefined && (
              <p className="mt-1 text-[11px] text-zinc-500">
                {check.points}/{check.maxPoints} pts
              </p>
            )}
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase',
              style.text,
              style.bg
            )}
          >
            {verdictLabel}
          </span>
        </div>

        {check.previewWidget && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {check.previewWidget}
          </div>
        )}

        {fixContent ? (
          <div className={cn('mt-4 space-y-3 border-t border-white/10 pt-4', check.previewWidget && 'border-t-0 pt-0')}>
            {(fixContent.currentValue || fixContent.recommendedValue) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailPanel
                  label="Current"
                  body={fixContent.currentValue || check.detail || 'Not provided'}
                />
                <DetailPanel
                  label="Recommended"
                  body={fixContent.recommendedValue || 'Use the recommended configuration for this check.'}
                />
              </div>
            ) : null}

            {fixContent.whyItMatters ? (
              <DetailPanel label="Why it matters" body={fixContent.whyItMatters} />
            ) : null}

            {fixContent.media ? <MediaPanel media={fixContent.media} /> : null}

            {fixContent.implementationSteps?.length ? (
              <div className="rounded-lg border border-white/8 bg-black/20 px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  How to fix it
                </p>
                <ol className="mt-2 space-y-2 text-xs leading-6 text-zinc-300">
                  {fixContent.implementationSteps.map((step, index) => (
                    <li key={`${check.label}-step-${index}`} className="flex gap-2">
                      <span className="mt-[3px] text-zinc-500">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {(fixContent.verification || fixContent.ctaLabel) ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                {fixContent.verification ? (
                  <DetailPanel
                    label="Verification"
                    body={fixContent.verification}
                    className="sm:flex-1"
                  />
                ) : <div className="sm:flex-1" />}
                {fixContent.ctaLabel && fixContent.ctaHref ? (
                  <a
                    href={fixContent.ctaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-200 transition-colors hover:bg-white/[0.07]"
                  >
                    {fixContent.ctaLabel}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  /* Locked state - matches screenshot: bullet, title, info icon, upgrade text, Locked badge */
  const lockedCard = (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {EngineIcon ? (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ENGINE_ICON_COLORS[check.engineKey!])}>
            <EngineIcon className="h-5 w-5" />
          </span>
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-300">{check.label}</p>
            <Info className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Upgrade to unlock full details for this check.
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-400">
        <Lock className="h-3.5 w-3.5" />
        Locked
      </span>
    </>
  );

  if (onLockedClick) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        className="flex w-full items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/12 hover:bg-white/[0.04]"
      >
        {lockedCard}
      </button>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      {lockedCard}
    </div>
  );
}

function DetailPanel({
  label,
  body,
  className,
}: {
  label: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-white/8 bg-black/20 px-3.5 py-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-xs leading-6 text-zinc-300">{body}</p>
    </div>
  );
}

function MediaPanel({
  media,
}: {
  media: CheckFixContent['media'];
}) {
  if (!media) return null;

  if (media.kind === 'code' && media.code) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/30">
        <div className="border-b border-white/8 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {media.caption || 'Example'}
        </div>
        <pre className="overflow-x-auto p-3.5 text-[11px] leading-6 text-zinc-300">
          <code>{media.code}</code>
        </pre>
      </div>
    );
  }

  if (media.kind === 'image' && media.src) {
    if (media.presentation === 'icon') {
      return (
        <div className="rounded-xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.012)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <a
            href={media.src}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-lg border border-white/8 bg-black/25 px-4 py-4 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),rgba(255,255,255,0.02)_70%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <img
                src={media.src}
                alt={media.alt || ''}
                className="h-10 w-10 rounded-lg object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Asset preview
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-100">
                Favicon detected
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">{media.src}</p>
            </div>
          </a>
          {media.caption ? <p className="mt-3 text-[11px] text-zinc-500">{media.caption}</p> : null}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.012)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <a
          href={media.src}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-white/8 bg-[#09090a] transition-transform duration-200 hover:scale-[1.01]"
        >
          <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)] p-2">
            <img
              src={media.src}
              alt={media.alt || ''}
              className="max-h-[240px] w-full rounded-md object-cover"
            />
          </div>
        </a>
        {media.caption ? <p className="mt-2 text-[11px] text-zinc-500">{media.caption}</p> : null}
      </div>
    );
  }

  return null;
}
