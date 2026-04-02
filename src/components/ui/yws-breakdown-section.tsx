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
  hasPaid?: boolean;
  tooltip?: string;
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
    <div className={cn('relative', showClickHint && 'pt-7')}>
      {showClickHint && (
        <div className="absolute right-0 top-0 z-10 flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>👇</span>
          Click to open / close
        </div>
      )}

      <section className="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* ── Header row ── */}
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
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 sm:gap-6"
        >
          {/* Title + score */}
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900">
              {title}
              {tooltip && <InfoTooltip text={tooltip} className="ml-1.5 align-middle" />}
              {' '}
              <span style={{ color: scoreColor }} className="tabular-nums">{displayScore}</span>
              <span className="text-[13px] font-normal text-gray-400 tabular-nums">/{maxScore}</span>
            </h3>
          </div>

          {/* Copy button + indicators */}
          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            {onCopyToLlm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyToLlm();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Copy className="h-3 w-3" />
                {copied ? copiedLabel : copyLabel}
              </button>
            )}
            <div className="flex items-center gap-3.5 text-[12px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {passCount}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {unknownCount}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                {failCount}
              </span>
            </div>
          </div>

          {/* Chevron */}
          <div className="shrink-0">
            {expanded
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>

        {/* ── Expanded body ── */}
        {expanded && (
          <div className="border-t border-gray-100 px-5 py-4">
            {sections.map((section) => (
              <div key={section.label || 'main'} className={section.label ? 'mt-6 first:mt-0' : ''}>
                {section.label && (
                  <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {section.label}
                  </h4>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
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

// Light-theme verdict styles — cards stay white, color lives in icon + badge only
const VERDICT_STYLES = {
  pass:    { bg: 'bg-white', text: 'text-emerald-600', border: 'border-gray-200', badgeBg: 'bg-emerald-50',  Icon: CheckCircle2 },
  fail:    { bg: 'bg-white', text: 'text-red-500',     border: 'border-gray-200', badgeBg: 'bg-red-50',     Icon: XCircle },
  unknown: { bg: 'bg-white', text: 'text-amber-600',   border: 'border-gray-200', badgeBg: 'bg-amber-50',   Icon: HelpCircle },
} as const;

const PASS_QUALITY_STYLES = {
  strong: { bg: 'bg-white', text: 'text-emerald-600', border: 'border-gray-200', badgeBg: 'bg-emerald-50',  Icon: CheckCircle2 },
  normal: { bg: 'bg-white', text: 'text-emerald-600', border: 'border-gray-200', badgeBg: 'bg-emerald-50',  Icon: CheckCircle2 },
  low:    { bg: 'bg-white', text: 'text-amber-600',   border: 'border-gray-200', badgeBg: 'bg-amber-50',    Icon: CheckCircle2 },
} as const;

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
    const style = check.verdict === 'pass' && check.verdictQuality
      ? PASS_QUALITY_STYLES[check.verdictQuality]
      : VERDICT_STYLES[check.verdict!];
    const VerdictIcon = style.Icon;

    const verdictLabel =
      check.verdict === 'pass' && check.verdictQuality === 'low'   ? 'low pass'    :
      check.verdict === 'pass' && check.verdictQuality === 'strong' ? 'strong pass' :
      check.verdict ?? 'unknown';

    const fixContent = check.fixContent;

    return (
      <div className={cn('rounded-xl border p-4', style.border, style.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {EngineIcon ? (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100"
                  style={{ color: ENGINE_ICON_COLORS[check.engineKey!] }}
                >
                  <EngineIcon className="h-4 w-4" />
                </span>
              ) : (
                <VerdictIcon className={cn('h-4 w-4 shrink-0', style.text)} />
              )}
              <p className="text-[13px] font-semibold text-gray-900">{check.label}</p>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-gray-600">{check.detail}</p>
            {check.points !== undefined && check.maxPoints !== undefined && (
              <p className="mt-1 text-[11px] text-gray-400">
                {check.points}/{check.maxPoints} pts
              </p>
            )}
          </div>
          <span className={cn(
            'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            style.text, style.badgeBg
          )}>
            {verdictLabel}
          </span>
        </div>

        {check.previewWidget && (
          <div className="mt-4 border-t border-black/[0.06] pt-4">
            {check.previewWidget}
          </div>
        )}

        {fixContent ? (
          <div className={cn('mt-4 space-y-3 border-t border-black/[0.06] pt-4', check.previewWidget && 'border-t-0 pt-0')}>
            {(fixContent.currentValue || fixContent.recommendedValue) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailPanel label="Current"     body={fixContent.currentValue || check.detail || 'Not provided'} />
                <DetailPanel label="Recommended" body={fixContent.recommendedValue || 'Use the recommended configuration for this check.'} />
              </div>
            ) : null}

            {fixContent.whyItMatters ? (
              <DetailPanel label="Why it matters" body={fixContent.whyItMatters} />
            ) : null}

            {fixContent.media ? <MediaPanel media={fixContent.media} /> : null}

            {fixContent.implementationSteps?.length ? (
              <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">How to fix it</p>
                <ol className="mt-2 space-y-2 text-[12px] leading-6 text-gray-700">
                  {fixContent.implementationSteps.map((step, index) => (
                    <li key={`${check.label}-step-${index}`} className="flex gap-2">
                      <span className="mt-[3px] text-gray-400">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {(fixContent.verification || fixContent.ctaLabel) ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                {fixContent.verification ? (
                  <DetailPanel label="Verification" body={fixContent.verification} className="sm:flex-1" />
                ) : <div className="sm:flex-1" />}
                {fixContent.ctaLabel && fixContent.ctaHref ? (
                  <a
                    href={fixContent.ctaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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

  /* ── Locked state ── */
  const lockedCard = (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {EngineIcon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100"
            style={{ color: ENGINE_ICON_COLORS[check.engineKey!] }}>
            <EngineIcon className="h-4 w-4" />
          </span>
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-gray-700">{check.label}</p>
            <Info className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">Upgrade to unlock full details.</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-500">
        <Lock className="h-3 w-3" />
        Locked
      </span>
    </>
  );

  if (onLockedClick) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
      >
        {lockedCard}
      </button>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      {lockedCard}
    </div>
  );
}

function DetailPanel({ label, body, className }: { label: string; body: string; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white px-3.5 py-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <p className="mt-1.5 break-words text-[12px] leading-5 text-gray-700">{body}</p>
    </div>
  );
}

function MediaPanel({ media }: { media: CheckFixContent['media'] }) {
  if (!media) return null;

  if (media.kind === 'code' && media.code) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <div className="border-b border-gray-200 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          {media.caption || 'Example'}
        </div>
        <pre className="overflow-x-auto p-3.5 text-[11px] leading-6 text-gray-700">
          <code>{media.code}</code>
        </pre>
      </div>
    );
  }

  if (media.kind === 'image' && media.src) {
    if (media.presentation === 'icon') {
      return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <a
            href={media.src}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
              <img src={media.src} alt={media.alt || ''} className="h-9 w-9 rounded-lg object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">Asset preview</p>
              <p className="mt-0.5 text-[13px] font-medium text-gray-900">Favicon detected</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-400">{media.src}</p>
            </div>
          </a>
          {media.caption ? <p className="mt-2 text-[11px] text-gray-400">{media.caption}</p> : null}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <a
          href={media.src}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-gray-200 bg-white transition-transform duration-200 hover:scale-[1.01]"
        >
          <img src={media.src} alt={media.alt || ''} className="max-h-[220px] w-full rounded-md object-cover" />
        </a>
        {media.caption ? <p className="mt-2 text-[11px] text-gray-400">{media.caption}</p> : null}
      </div>
    );
  }

  return null;
}
