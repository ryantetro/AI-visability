'use client';

import { useState } from 'react';
import { Copy, ArrowUpRight, RefreshCw } from 'lucide-react';
import { ScoreSummaryHero } from '@/components/app/score-summary-hero';
import { YwsBreakdownSection } from '@/components/ui/yws-breakdown-section';
import type { CheckItem } from '@/components/ui/yws-breakdown-section';
import { getCheckFixContent } from '@/lib/analysis-fix-content';
import { cn } from '@/lib/utils';
import type { DashboardReportData, FilesData, AssetPreview } from '../lib/types';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';

interface ReportSectionProps {
  report: DashboardReportData;
  files: FilesData | null;
  domain: string;
  onReaudit?: () => void;
  reauditing?: boolean;
}

/** Returns a CSS color string (not a Tailwind class) matching the analysis page */
function scoreColor(score: number | null): string {
  if (score === null) return 'var(--color-warning, #ff8a1e)';
  if (score >= 80) return '#25c972';
  if (score >= 60) return '#ff8a1e';
  return '#ff5252';
}

/** Convert a check from our data to a rich CheckItem with fix content */
function toCheckItem(check: {
  id?: string;
  label: string;
  detail?: string;
  verdict?: 'pass' | 'fail' | 'unknown';
  points?: number;
  maxPoints?: number;
}): CheckItem {
  return {
    label: check.label,
    detail: check.detail,
    verdict: check.verdict,
    points: check.points,
    maxPoints: check.maxPoints,
    fixContent: getCheckFixContent(check.label),
  };
}

/** Build a CheckItem with a live preview widget for OG/Twitter/Favicon checks */
function toRichCheckItem(
  check: { id?: string; label: string; detail?: string; verdict?: 'pass' | 'fail' | 'unknown'; points?: number; maxPoints?: number },
  assetPreview?: AssetPreview | null,
  domain?: string,
): CheckItem {
  const base = toCheckItem(check);
  const normalizedLabel = check.label.trim().toLowerCase();

  if ((normalizedLabel === 'favicon present' || normalizedLabel === 'favicon') && assetPreview?.faviconUrl) {
    return {
      ...base,
      previewWidget: <FaviconPreview url={assetPreview.faviconUrl} domain={domain} />,
    };
  }

  if ((normalizedLabel === 'open graph coverage' || normalizedLabel === 'open graph') &&
    (assetPreview?.ogImageUrl || assetPreview?.ogTitle || assetPreview?.ogDescription)) {
    return {
      ...base,
      previewWidget: (
        <OgPreviewCard
          title={assetPreview.ogTitle}
          description={assetPreview.ogDescription}
          imageUrl={assetPreview.ogImageUrl}
          url={assetPreview.ogUrl ?? (domain ? `https://${domain}` : null)}
        />
      ),
    };
  }

  if ((normalizedLabel === 'twitter card coverage' || normalizedLabel === 'twitter cards') &&
    (assetPreview?.twitterImageUrl || assetPreview?.twitterTitle || assetPreview?.twitterDescription)) {
    return {
      ...base,
      previewWidget: (
        <TwitterPreviewCard
          title={assetPreview.twitterTitle ?? assetPreview.ogTitle}
          description={assetPreview.twitterDescription ?? assetPreview.ogDescription}
          imageUrl={assetPreview.twitterImageUrl ?? assetPreview.ogImageUrl}
          domain={domain}
          cardType={assetPreview.twitterCard}
        />
      ),
    };
  }

  return base;
}

export function ReportSection({ report, files, domain, onReaudit, reauditing }: ReportSectionProps) {
  const scores = report.score.scores;
  const webHealth = report.score.webHealth;
  const mentions = report.mentionSummary;
  const dimensions = report.score.dimensions ?? [];
  const fixes = report.score.fixes ?? report.fixes ?? [];
  const copyToLlm = report.copyToLlm ?? files?.copyToLlm ?? null;
  const assetPreview = report.assetPreview ?? null;
  const [reportPromptCopied, setReportPromptCopied] = useState(false);

  const handleCopyReportPrompt = () => {
    if (!copyToLlm?.fullPrompt) return;
    void navigator.clipboard.writeText(copyToLlm.fullPrompt);
    setReportPromptCopied(true);
    setTimeout(() => setReportPromptCopied(false), 2000);
  };

  // Always paid since this is the advanced dashboard
  const hasPaid = report.hasPaid;

  // Pillar lookups
  const qualityPillar = webHealth?.pillars?.find((p) => p.key === 'quality');
  const securityPillar = webHealth?.pillars?.find((p) => p.key === 'security');
  const perfPillar = webHealth?.pillars?.find((p) => p.key === 'performance');

  return (
    <div className="space-y-4">
      {/* ─── Score Summary Hero ─── */}
      <div className="mb-5">
        <ScoreSummaryHero
          domain={domain}
          url={`https://${domain}`}
          overall={{
            score: scores.overall ?? scores.aiVisibility,
            color: scoreColor(scores.overall ?? scores.aiVisibility),
            label: 'Overall Score',
            caption: report.score.overallBandInfo?.label,
          }}
          supporting={[
            {
              label: 'Website Quality',
              score: qualityPillar?.percentage ?? scores.webHealth ?? null,
              color: scoreColor(qualityPillar?.percentage ?? scores.webHealth ?? null),
            },
            {
              label: 'Trust & Security',
              score: securityPillar?.percentage ?? null,
              color: scoreColor(securityPillar?.percentage ?? null),
            },
            {
              label: 'PageSpeed',
              score: perfPillar?.percentage ?? null,
              color: scoreColor(perfPillar?.percentage ?? null),
            },
            {
              label: 'AI Mentions',
              score: mentions?.overallScore ?? null,
              color: scoreColor(mentions?.overallScore ?? null),
            },
          ]}
          actions={
            <>
              {onReaudit && (
                <button
                  type="button"
                  onClick={onReaudit}
                  disabled={reauditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', reauditing && 'animate-spin')} />
                  {reauditing ? 'Scanning...' : 'Rescan'}
                </button>
              )}
              {copyToLlm?.fullPrompt && (
                <button
                  type="button"
                  onClick={handleCopyReportPrompt}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {reportPromptCopied ? 'Copied full prompt' : 'Copy to LLM'}
                </button>
              )}
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Visit site
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </>
          }
        />
      </div>

      {/* Click hint */}
      <div className="mb-2 flex items-center justify-end gap-1.5 text-[11px] text-zinc-400">
        <span className="animate-bounce">👇</span>
        Click to open / close
      </div>

      {/* ─── Scrollable Breakdown Sections ─── */}
      <div className="space-y-4">
        {/* ─── AI Mentions ─── */}
        {mentions && (() => {
          const engines = AI_ENGINES;
          const engineBreakdown = mentions.engineBreakdown;
          const results = mentions.results ?? [];

          // Fallback: build engine breakdown from results if not provided
          const engineBd = engineBreakdown ?? (() => {
            const map: Record<string, { mentioned: number; total: number }> = {};
            for (const r of results) {
              const key = r.engine.toLowerCase();
              if (!map[key]) map[key] = { mentioned: 0, total: 0 };
              map[key].total++;
              if (r.mentioned) map[key].mentioned++;
            }
            return map;
          })();

          const mentionPass = engines.filter((e) => mentions.engineStatus[e]?.status === 'complete' && (engineBd[e]?.mentioned ?? 0) > 0).length;
          const mentionFail = engines.filter((e) => mentions.engineStatus[e]?.status === 'complete' && (engineBd[e]?.mentioned ?? 0) === 0 && (engineBd[e]?.total ?? 0) > 0).length;

          return (
            <YwsBreakdownSection
              title="AI Mentions"
              score={mentions.overallScore}
              scoreColor={scoreColor(mentions.overallScore)}
              passCount={mentionPass}
              failCount={mentionFail}
              unknownCount={engines.length - mentionPass - mentionFail}
              checks={[]}
              subSections={[
                {
                  label: 'Engine Breakdown',
                  checks: engines.map((engine) => {
                    const eb = engineBd[engine];
                    const status = mentions.engineStatus[engine];
                    const mentioned = eb?.mentioned ?? 0;
                    const total = eb?.total ?? 0;
                    const sentiment = eb?.sentiment;
                    const detail =
                      status?.status === 'not_backfilled'
                        ? 'Not tested on this scan yet'
                        : status?.status === 'not_configured'
                          ? 'Not configured on this run'
                          : status?.status === 'error'
                            ? `Testing error${status.errorMessage ? ` · ${status.errorMessage}` : ''}`
                            : `${mentioned}/${total} prompts mentioned${sentiment ? ` · ${sentiment}` : ''}`;
                    return {
                      label: getAIEngineLabel(engine),
                      detail,
                      verdict: (
                        status?.status !== 'complete'
                          ? 'unknown'
                          : mentioned > 0
                            ? 'pass'
                            : 'fail'
                      ) as 'pass' | 'fail' | 'unknown',
                      engineKey: engine,
                    };
                  }),
                },
                ...(mentions.promptsUsed && mentions.promptsUsed.length > 0 ? [{
                  label: 'Prompt Results',
                  checks: mentions.promptsUsed.map((prompt) => {
                    const promptResults = results.filter((r) => r.prompt.id === prompt.id);
                    const mentionedCount = promptResults.filter((r) => r.mentioned).length;
                    return {
                      label: `"${prompt.text}"`,
                      detail: `Mentioned by ${mentionedCount}/${promptResults.length} engines`,
                      verdict: (mentionedCount > promptResults.length / 2 ? 'pass' : 'fail') as 'pass' | 'fail',
                    };
                  }),
                }] : []),
                ...(mentions.competitorsMentioned && mentions.competitorsMentioned.length > 0
                  ? [{
                      label: 'Top Competitors',
                      checks: mentions.competitorsMentioned.slice(0, 5).map((c) => ({
                        label: c.name,
                        detail: `Mentioned ${c.count} times across AI engines`,
                        verdict: 'unknown' as const,
                      })),
                    }]
                  : []),
              ]}
              defaultExpanded={false}
              showClickHint={false}
              hasPaid={hasPaid}
            />
          );
        })()}

        {/* ─── Repair Queue ─── */}
        {fixes.length > 0 && (
          <YwsBreakdownSection
            title="Repair Queue"
            score={null}
            maxScore={fixes.length}
            scoreColor={scoreColor(null)}
            passCount={fixes.filter((f) => f.category === 'ai').length}
            failCount={fixes.filter((f) => f.category === 'web').length}
            unknownCount={0}
            checks={fixes.slice(0, 10).map((fix) => ({
              label: fix.label,
              detail: `${fix.instruction} (+${fix.estimatedLift} pts, ${fix.effortBand} effort)`,
              verdict: 'fail' as const,
            }))}
            defaultExpanded={false}
            hasPaid={hasPaid}
          />
        )}

        {/* ─── AI Readiness (File Presence + Structured Data + AI Registration) ─── */}
        {(() => {
          const readinessKeys = ['file-presence', 'structured-data', 'ai-registration'];
          const readinessDims = dimensions.filter((d) => readinessKeys.includes(d.key));
          if (readinessDims.length === 0) return null;
          const allChecks = readinessDims.flatMap((d) => d.checks);
          const avgScore = Math.round(readinessDims.reduce((s, d) => s + d.percentage, 0) / readinessDims.length);
          return (
            <YwsBreakdownSection
              title="AI Readiness"
              score={avgScore}
              scoreColor={scoreColor(avgScore)}
              onCopyToLlm={handleCopyReportPrompt}
              copied={reportPromptCopied}
              passCount={allChecks.filter((c) => c.verdict === 'pass').length}
              failCount={allChecks.filter((c) => c.verdict === 'fail').length}
              unknownCount={allChecks.filter((c) => c.verdict === 'unknown').length}
              checks={[]}
              subSections={readinessDims.map((d) => ({
                label: d.label,
                checks: d.checks.map((check) => toRichCheckItem(check, assetPreview, domain)),
              }))}
              defaultExpanded={false}
              showClickHint={true}
              hasPaid={hasPaid}
            />
          );
        })()}

        {/* ─── Content & Authority (Content Signals + Topical Authority + Entity Clarity) ─── */}
        {(() => {
          const contentKeys = ['content-signals', 'topical-authority', 'entity-clarity'];
          const contentDims = dimensions.filter((d) => contentKeys.includes(d.key));
          if (contentDims.length === 0) return null;
          const allChecks = contentDims.flatMap((d) => d.checks);
          const avgScore = Math.round(contentDims.reduce((s, d) => s + d.percentage, 0) / contentDims.length);
          return (
            <YwsBreakdownSection
              title="Content & Authority"
              score={avgScore}
              scoreColor={scoreColor(avgScore)}
              onCopyToLlm={handleCopyReportPrompt}
              copied={reportPromptCopied}
              passCount={allChecks.filter((c) => c.verdict === 'pass').length}
              failCount={allChecks.filter((c) => c.verdict === 'fail').length}
              unknownCount={allChecks.filter((c) => c.verdict === 'unknown').length}
              checks={[]}
              subSections={contentDims.map((d) => ({
                label: d.label,
                checks: d.checks.map((check) => toRichCheckItem(check, assetPreview, domain)),
              }))}
              defaultExpanded={false}
              hasPaid={hasPaid}
            />
          );
        })()}

        {/* ─── Website Quality (Site Quality + Open Graph + Twitter Cards) ─── */}
        {(() => {
          const qualityChecks = qualityPillar?.checks ?? [];
          const siteQualityChecks = qualityChecks
            .filter((c) => c.id !== 'whq-open-graph' && c.id !== 'whq-twitter' && c.id !== 'whq-favicon')
            .map((c) => toRichCheckItem(c, assetPreview, domain));

          const faviconCheck = qualityChecks.find((c) => c.label === 'Favicon present' || c.id === 'whq-favicon');
          const ogCheck = qualityChecks.find((c) => c.label === 'Open Graph coverage' || c.id === 'whq-open-graph');
          const twitterCheck = qualityChecks.find((c) => c.label === 'Twitter card coverage' || c.id === 'whq-twitter');

          const faviconChecks = faviconCheck ? [toRichCheckItem(faviconCheck, assetPreview, domain)] : [];
          const ogChecks = ogCheck ? [toRichCheckItem(ogCheck, assetPreview, domain)] : [{ label: 'Open Graph' }];
          const twitterChecks = twitterCheck ? [toRichCheckItem(twitterCheck, assetPreview, domain)] : [{ label: 'Twitter Cards' }];

          const qualityPass = qualityChecks.filter((c) => c.verdict === 'pass').length;
          const qualityFail = qualityChecks.filter((c) => c.verdict === 'fail').length;
          const qualityUnknown = qualityChecks.filter((c) => c.verdict === 'unknown').length;

          return (
            <YwsBreakdownSection
              title="Website Quality"
              score={qualityPillar?.percentage ?? webHealth?.percentage ?? null}
              scoreColor={scoreColor(qualityPillar?.percentage ?? webHealth?.percentage ?? null)}
              onCopyToLlm={handleCopyReportPrompt}
              copied={reportPromptCopied}
              passCount={qualityPass}
              failCount={qualityFail}
              unknownCount={qualityUnknown}
              checks={[]}
              subSections={[
                { label: 'Site Quality', checks: siteQualityChecks.length > 0 ? siteQualityChecks : [{ label: 'No data available' }] },
                ...(faviconChecks.length > 0 ? [{ label: 'Favicon', checks: faviconChecks }] : []),
                { label: 'Open Graph', checks: ogChecks },
                { label: 'Twitter Cards', checks: twitterChecks },
              ]}
              defaultExpanded={false}
              hasPaid={hasPaid}
            />
          );
        })()}

        {/* ─── Performance & Security (Trust & Security + PageSpeed) ─── */}
        {(() => {
          const secChecks = securityPillar?.checks ?? [];
          const perfChecks = perfPillar?.checks ?? [];
          const allPillarChecks = [...secChecks, ...perfChecks];
          const totalPass = allPillarChecks.filter((c) => c.verdict === 'pass').length;
          const totalFail = allPillarChecks.filter((c) => c.verdict === 'fail').length;
          const totalUnknown = allPillarChecks.filter((c) => c.verdict === 'unknown').length;
          const secScore = securityPillar?.percentage ?? null;
          const perfScore = perfPillar?.percentage ?? null;
          const avgScore = secScore !== null && perfScore !== null
            ? Math.round((secScore + perfScore) / 2)
            : secScore ?? perfScore;
          return (
            <YwsBreakdownSection
              title="Performance & Security"
              score={avgScore}
              scoreColor={scoreColor(avgScore)}
              onCopyToLlm={handleCopyReportPrompt}
              copied={reportPromptCopied}
              passCount={totalPass}
              failCount={totalFail}
              unknownCount={totalUnknown}
              checks={[]}
              subSections={[
                { label: 'Trust & Security', checks: secChecks.length > 0 ? secChecks.map((c) => toCheckItem(c)) : [{ label: 'HTTPS' }, { label: 'Security Headers' }] },
                { label: 'PageSpeed', checks: perfChecks.length > 0 ? perfChecks.map((c) => toCheckItem(c)) : [{ label: 'Performance score' }] },
              ]}
              defaultExpanded={false}
              hasPaid={hasPaid}
            />
          );
        })()}
      </div>
    </div>
  );
}

/* ── Preview Widgets ────────────────────────────────────────────────────── */

/** Open Graph social card preview — mimics how the link looks when shared on Facebook/LinkedIn/Slack */
function OgPreviewCard({
  title,
  description,
  imageUrl,
  url,
}: {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  url?: string | null;
}) {
  const displayDomain = url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Live Open Graph preview
      </p>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#18191a]">
        {imageUrl && (
          <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="OG preview"
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="px-3 py-2.5">
          {displayDomain && (
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{displayDomain}</p>
          )}
          {title && (
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-zinc-100 line-clamp-2">{title}</p>
          )}
          {description && (
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Twitter/X card preview — mimics summary_large_image card style */
function TwitterPreviewCard({
  title,
  description,
  imageUrl,
  domain,
  cardType,
}: {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  domain?: string;
  cardType?: string | null;
}) {
  const isLargeImage = !cardType || cardType === 'summary_large_image';

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Live Twitter/X card preview
      </p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#15202b]">
        {isLargeImage && imageUrl ? (
          <>
            <div className="relative aspect-[2/1] w-full overflow-hidden bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Twitter card preview"
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="px-3 py-2.5">
              {title && (
                <p className="text-[13px] font-semibold leading-tight text-zinc-100 line-clamp-1">{title}</p>
              )}
              {description && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">{description}</p>
              )}
              {domain && (
                <p className="mt-1 text-[10px] text-zinc-500">{domain}</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex gap-3 p-3">
            {imageUrl && (
              <div className="h-[108px] w-[108px] shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Twitter card preview"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <p className="text-[13px] font-semibold leading-tight text-zinc-100 line-clamp-2">{title}</p>
              )}
              {description && (
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 line-clamp-3">{description}</p>
              )}
              {domain && (
                <p className="mt-1 text-[10px] text-zinc-500">{domain}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Favicon preview — shows the actual favicon image with context */
function FaviconPreview({ url, domain }: { url: string; domain?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Detected favicon
      </p>
      <div className="flex items-center gap-4 rounded-lg border border-white/8 bg-black/25 px-4 py-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Favicon"
            className="h-8 w-8 rounded object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100">Favicon detected</p>
          {domain && <p className="mt-0.5 text-[11px] text-zinc-500">{domain}</p>}
          <p className="mt-0.5 truncate text-[10px] text-zinc-600">{url}</p>
        </div>
      </div>
    </div>
  );
}
