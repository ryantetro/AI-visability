'use client';

import { useState } from 'react';
import { Copy, ArrowUpRight, RefreshCw, Share2, Check, Zap, FileCode, Search, Shield, Gauge } from 'lucide-react';
import { ScoreSummaryHero } from '@/components/app/score-summary-hero';
import { YwsBreakdownSection } from '@/components/ui/yws-breakdown-section';
import type { CheckItem, VerdictQuality } from '@/components/ui/yws-breakdown-section';
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
  const aiMentionsState = report.enrichments?.aiMentions;
  const mentionsPending = aiMentionsState?.status === 'pending' || aiMentionsState?.status === 'running';
  const mentionsDegraded = Boolean(aiMentionsState?.status === 'complete' && aiMentionsState?.metrics?.degraded);
  const mentionsUnavailable = Boolean(
    aiMentionsState?.status === 'failed' ||
    aiMentionsState?.status === 'unavailable' ||
    mentions &&
    (mentions.results?.length ?? 0) === 0 &&
    Object.values(mentions.engineStatus ?? {}).some((status) => status.status === 'error')
  );
  const dimensions = report.score.dimensions ?? [];
  const fixes = report.score.fixes ?? report.fixes ?? [];
  const copyToLlm = report.copyToLlm ?? files?.copyToLlm ?? null;
  const assetPreview = report.assetPreview ?? null;
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  const handleCopyPrompt = (key: string, prompt: string | undefined) => {
    if (!prompt) return;
    void navigator.clipboard.writeText(prompt);
    setCopiedPromptKey(key);
    setTimeout(() => setCopiedPromptKey((current) => (current === key ? null : current)), 2000);
  };

  const handleShareReport = () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${appUrl}/score/${report.id}`;
    void navigator.clipboard.writeText(shareUrl);
    setShareState('copied');
    setTimeout(() => setShareState('idle'), 2500);
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
              score: mentionsPending || mentionsUnavailable ? null : (mentions?.overallScore ?? null),
              color: scoreColor(mentionsPending || mentionsUnavailable ? null : (mentions?.overallScore ?? null)),
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
                  onClick={() => handleCopyPrompt('full', copyToLlm.fullPrompt)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copiedPromptKey === 'full' ? 'Copied full-site prompt' : 'Copy full-site fix prompt'}
                </button>
              )}
              <button
                type="button"
                onClick={handleShareReport}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
              >
                {shareState === 'copied' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {shareState === 'copied' ? 'Link copied!' : 'Share Report'}
              </button>
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

      {/* ─── Take Action Section ─── */}
      <TakeActionSection
        report={report}
        domain={domain}
        files={files}
        copyToLlm={copyToLlm}
        onCopyPrompt={handleCopyPrompt}
        copiedPromptKey={copiedPromptKey}
      />

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
            <div id="section-ai-mentions" className="scroll-mt-4 rounded-xl transition-all duration-500">
            {mentionsDegraded && (
              <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
                AI Mentions completed with fallback prompts or heuristic analysis because one or more providers slowed down or timed out during this run.
              </div>
            )}
            {mentionsUnavailable && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-200">
                AI Mentions did not complete cleanly for this scan, so this section is unavailable for reliable scoring.
              </div>
            )}
            <YwsBreakdownSection
              title="AI Mentions"
              tooltip="How often AI engines mention your brand when users ask relevant questions. Based on live queries to ChatGPT, Perplexity, Gemini, and Claude."
              score={mentionsPending || mentionsUnavailable ? null : mentions.overallScore}
              scoreColor={scoreColor(mentionsPending || mentionsUnavailable ? null : mentions.overallScore)}
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
                    const verdict: 'pass' | 'fail' | 'unknown' =
                      status?.status !== 'complete'
                        ? 'unknown'
                        : mentioned > 0
                          ? 'pass'
                          : 'fail';
                    const mentionRatio = total > 0 ? mentioned / total : 0;
                    const verdictQuality: VerdictQuality | undefined =
                      verdict === 'pass'
                        ? mentionRatio >= 0.5
                          ? 'strong'
                          : mentionRatio >= 0.25
                            ? 'normal'
                            : 'low'
                        : undefined;
                    return {
                      label: getAIEngineLabel(engine),
                      detail,
                      verdict,
                      verdictQuality,
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
            </div>
          );
        })()}

        {/* ─── Repair Queue ─── */}
        {fixes.length > 0 && (
          <div id="section-repair-queue" className="scroll-mt-4 rounded-xl transition-all duration-500">
          <YwsBreakdownSection
            title="Priority Fixes"
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
          </div>
        )}

        {/* ─── AI Readiness (File Presence + Structured Data + AI Registration) ─── */}
        {(() => {
          const readinessKeys = ['file-presence', 'structured-data', 'ai-registration'];
          const readinessDims = dimensions.filter((d) => readinessKeys.includes(d.key));
          if (readinessDims.length === 0) return null;
          const allChecks = readinessDims.flatMap((d) => d.checks);
          const avgScore = Math.round(readinessDims.reduce((s, d) => s + d.percentage, 0) / readinessDims.length);
          const readinessPrompt = copyToLlm?.sectionPrompts.aiReadiness?.prompt;
          return (
            <div id="section-ai-readiness" className="scroll-mt-4 rounded-xl transition-all duration-500">
            <YwsBreakdownSection
              title="AI Discoverability"
              tooltip="Whether AI crawlers can find and understand your site. Checks robots.txt, structured data, schema markup, and AI-specific registration files."
              score={avgScore}
              scoreColor={scoreColor(avgScore)}
              onCopyToLlm={readinessPrompt ? () => handleCopyPrompt('aiReadiness', readinessPrompt) : undefined}
              copied={copiedPromptKey === 'aiReadiness'}
              copyLabel="Copy AI discoverability fixes to ChatGPT"
              copiedLabel="Copied!"
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
            </div>
          );
        })()}

        {/* ─── Content & Authority (Content Signals + Topical Authority + Entity Clarity) ─── */}
        {(() => {
          const contentKeys = ['content-signals', 'topical-authority', 'entity-clarity'];
          const contentDims = dimensions.filter((d) => contentKeys.includes(d.key));
          if (contentDims.length === 0) return null;
          const allChecks = contentDims.flatMap((d) => d.checks);
          const avgScore = Math.round(contentDims.reduce((s, d) => s + d.percentage, 0) / contentDims.length);
          const contentPrompt = copyToLlm?.sectionPrompts.contentAuthority?.prompt;
          return (
            <div id="section-content-authority" className="scroll-mt-4 rounded-xl transition-all duration-500">
            <YwsBreakdownSection
              title="Content & Expertise"
              tooltip="How well your content demonstrates expertise and authority. Includes content quality signals, topical depth, and clear brand identity."
              score={avgScore}
              scoreColor={scoreColor(avgScore)}
              onCopyToLlm={contentPrompt ? () => handleCopyPrompt('contentAuthority', contentPrompt) : undefined}
              copied={copiedPromptKey === 'contentAuthority'}
              copyLabel="Copy content fixes to ChatGPT"
              copiedLabel="Copied!"
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
            </div>
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
          const qualityPrompt = copyToLlm?.sectionPrompts.websiteQuality?.prompt;

          return (
            <div id="section-website-quality" className="scroll-mt-4 rounded-xl transition-all duration-500">
            <YwsBreakdownSection
              title="Website Quality"
              tooltip="Core web standards that affect how AI and search engines perceive your site — meta tags, Open Graph, favicons, heading structure, and more."
              score={qualityPillar?.percentage ?? webHealth?.percentage ?? null}
              scoreColor={scoreColor(qualityPillar?.percentage ?? webHealth?.percentage ?? null)}
              onCopyToLlm={qualityPrompt ? () => handleCopyPrompt('websiteQuality', qualityPrompt) : undefined}
              copied={copiedPromptKey === 'websiteQuality'}
              copyLabel="Copy quality fixes to ChatGPT"
              copiedLabel="Copied!"
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
            </div>
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
          const performancePrompt = copyToLlm?.sectionPrompts.performanceSecurity?.prompt;
          return (
            <div id="section-performance-security" className="scroll-mt-4 rounded-xl transition-all duration-500">
            <YwsBreakdownSection
              title="Performance & Security"
              tooltip="Page speed (Core Web Vitals) and security signals (HTTPS, headers, CSP). Fast, secure sites are more trusted by AI systems."
              score={avgScore}
              scoreColor={scoreColor(avgScore)}
              onCopyToLlm={performancePrompt ? () => handleCopyPrompt('performanceSecurity', performancePrompt) : undefined}
              copied={copiedPromptKey === 'performanceSecurity'}
              copyLabel="Copy security fixes to ChatGPT"
              copiedLabel="Copied!"
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
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ── Take Action Panel ──────────────────────────────────────────────────── */

interface ActionStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  scrollTarget?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}

function TakeActionSection({
  report,
  domain,
  files,
  copyToLlm,
  onCopyPrompt,
  copiedPromptKey,
}: {
  report: DashboardReportData;
  domain: string;
  files: FilesData | null;
  copyToLlm: FilesData['copyToLlm'] | null;
  onCopyPrompt: (key: string, prompt: string | undefined) => void;
  copiedPromptKey: string | null;
}) {
  const scores = report.score.scores;
  const overallScore = scores.overall ?? scores.aiVisibility;
  const mentions = report.mentionSummary;
  const fixes = report.score.fixes ?? report.fixes ?? [];
  const webHealth = report.score.webHealth;
  const qualityPillar = webHealth?.pillars?.find((p) => p.key === 'quality');
  const securityPillar = webHealth?.pillars?.find((p) => p.key === 'security');
  const perfPillar = webHealth?.pillars?.find((p) => p.key === 'performance');

  const steps: ActionStep[] = [];

  // 1. If there are generated fix files, suggest installing them
  if (files?.files && files.files.length > 0) {
    steps.push({
      icon: <FileCode className="h-5 w-5" />,
      title: 'Install generated fix files on your site',
      description: `We generated ${files.files.length} file${files.files.length > 1 ? 's' : ''} to improve your AI visibility. Download and add ${files.files.length > 1 ? 'them' : 'it'} to your website root directory.`,
      priority: 'high',
      scrollTarget: 'section-ai-readiness',
    });
  }

  // 2. Copy the full-site fix prompt and paste it into an AI tool
  if (copyToLlm?.fullPrompt) {
    steps.push({
      icon: <Copy className="h-5 w-5" />,
      title: 'Copy fix prompt into ChatGPT or Claude',
      description: 'Use the full-site fix prompt with an AI assistant to get step-by-step implementation guidance tailored to your site.',
      priority: 'high',
      scrollTarget: 'section-repair-queue',
      action: {
        label: copiedPromptKey === 'action-full' ? 'Copied!' : 'Copy fix prompt',
        onClick: () => onCopyPrompt('action-full', copyToLlm.fullPrompt),
      },
    });
  }

  // 3. AI Mentions — if low, suggest improving
  if (mentions) {
    const mentionScore = mentions.overallScore;
    if (mentionScore < 50) {
      const engineCount = Object.values(mentions.engineBreakdown).filter((e) => e.mentioned > 0).length;
      const totalEngines = Object.keys(mentions.engineBreakdown).length;
      steps.push({
        icon: <Search className="h-5 w-5" />,
        title: 'Increase your AI mentions',
        description: `You're only visible on ${engineCount}/${totalEngines} AI engines. Add structured data, improve your content authority, and ensure your brand name appears in relevant industry contexts to get mentioned more.`,
        priority: mentionScore < 25 ? 'high' : 'medium',
        scrollTarget: 'section-ai-mentions',
      });
    }
  }

  // 4. Website quality issues
  if (qualityPillar?.percentage !== null && qualityPillar?.percentage !== undefined && qualityPillar.percentage < 70) {
    const failedChecks = qualityPillar.checks?.filter((c) => c.verdict === 'fail') ?? [];
    steps.push({
      icon: <Gauge className="h-5 w-5" />,
      title: 'Fix website quality issues',
      description: failedChecks.length > 0
        ? `Fix these issues: ${failedChecks.slice(0, 3).map((c) => c.label).join(', ')}${failedChecks.length > 3 ? ` and ${failedChecks.length - 3} more` : ''}.`
        : 'Improve your site quality score by fixing Open Graph tags, meta descriptions, and heading structure.',
      priority: qualityPillar.percentage < 50 ? 'high' : 'medium',
      scrollTarget: 'section-website-quality',
    });
  }

  // 5. Security / trust issues
  if (securityPillar?.percentage !== null && securityPillar?.percentage !== undefined && securityPillar.percentage < 70) {
    steps.push({
      icon: <Shield className="h-5 w-5" />,
      title: 'Strengthen trust & security',
      description: 'Add security headers, ensure HTTPS is enforced, and implement a Content Security Policy to improve your trust signals.',
      priority: 'medium',
      scrollTarget: 'section-performance-security',
    });
  }

  // 6. Performance issues
  if (perfPillar?.percentage !== null && perfPillar?.percentage !== undefined && perfPillar.percentage < 70) {
    steps.push({
      icon: <Gauge className="h-5 w-5" />,
      title: 'Improve page speed',
      description: 'Optimize images, reduce JavaScript blocking, and improve Largest Contentful Paint to boost performance scores.',
      priority: 'medium',
      scrollTarget: 'section-performance-security',
    });
  }

  // 7. Top repair queue items
  if (fixes.length > 0 && steps.length < 5) {
    const topFix = fixes[0];
    steps.push({
      icon: <Zap className="h-5 w-5" />,
      title: `Quick win: ${topFix.label}`,
      description: `${topFix.instruction} (estimated +${topFix.estimatedLift} points, ${topFix.effortBand} effort)`,
      priority: 'medium',
      scrollTarget: 'section-repair-queue',
    });
  }

  if (steps.length === 0) return null;

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  steps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-white">Take Action</h3>
          <p className="text-xs text-zinc-400">
            {overallScore >= 80
              ? 'Great score! Here are ways to stay ahead.'
              : overallScore >= 60
                ? 'Good start. These steps will push your score higher.'
                : 'Your site needs attention. Follow these steps to improve.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.slice(0, 5).map((step, index) => (
          <button
            key={`action-${index}`}
            type="button"
            onClick={() => {
              if (step.scrollTarget) {
                const el = document.getElementById(step.scrollTarget);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Briefly highlight the target section
                  el.classList.add('ring-2', 'ring-emerald-500/40');
                  setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500/40'), 2000);
                }
              }
            }}
            className={cn(
              'flex w-full items-start gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors',
              step.scrollTarget && 'cursor-pointer hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]',
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
              <span className="text-xs font-bold text-zinc-300">{index + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-zinc-400',
                  step.priority === 'high' && 'text-emerald-400',
                )}>
                  {step.icon}
                </span>
                <p className="text-sm font-medium text-white">{step.title}</p>
                {step.priority === 'high' && (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-400">
                    Priority
                  </span>
                )}
                {step.scrollTarget && (
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{step.description}</p>
              {step.action && (
                <div className="mt-2">
                  {step.action.href ? (
                    <a
                      href={step.action.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      {step.action.label}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); step.action?.onClick?.(); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); step.action?.onClick?.(); } }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      {step.action.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
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
