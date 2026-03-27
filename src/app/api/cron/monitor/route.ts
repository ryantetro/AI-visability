import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getAlertService, getMentionTester, getPromptMonitoring } from '@/lib/services/registry';
import { analyzeResponse } from '@/lib/ai-mentions/mention-analyzer';
import { listActiveMonitoringDomains, updateMonitoringDomain } from '@/lib/monitoring';
import { getOpportunityAlertSummary, hasOpportunityAlertCooldownElapsed } from '@/lib/opportunity-alerts';
import { startScan } from '@/lib/scan-workflow';
import { getSupabaseClient } from '@/lib/supabase';
import { getDomain } from '@/lib/url-utils';
import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';
import { getUserAccess } from '@/lib/access';
import { getCurrentBillingReadiness } from '@/lib/billing';
import { getScannableEngines, getSelectedPlatforms } from '@/lib/platform-gating';
import { applyRegionContext, getSelectedRegions, DEFAULT_REGION_ID } from '@/lib/region-gating';

const VALID_CATEGORIES: MentionPrompt['category'][] = [
  'direct', 'category', 'comparison', 'recommendation',
  'workflow', 'use-case', 'problem-solution', 'buyer-intent',
];

function isValidCategory(cat: string): cat is MentionPrompt['category'] {
  return (VALID_CATEGORIES as string[]).includes(cat);
}

const RESCAN_STALENESS_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RESCANS_PER_RUN = 5;

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.MONITORING_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  const alertService = getAlertService();

  try {
    // ── Phase 0: Automated re-scans for score trending ──────────
    const rescans: Array<{ domain: string; status: string; scanId?: string }> = [];

    try {
      const monitoredDomains = await listActiveMonitoringDomains();
      let rescanCount = 0;

      for (const record of monitoredDomains) {
        if (rescanCount >= MAX_RESCANS_PER_RUN) break;

        try {
          const domain = getDomain(record.url);
          const latestScan = await db.findLatestScanByDomain(domain);
          const lastCompleted = latestScan?.completedAt ?? 0;

          if (Date.now() - lastCompleted < RESCAN_STALENESS_MS) {
            rescans.push({ domain, status: 'recent, skipping' });
            continue;
          }

          const userId = await getUserIdByEmail(record.email);
          if (!userId) {
            rescans.push({ domain, status: 'no user found, skipping' });
            continue;
          }

          const result = await startScan(
            {
              url: record.url,
              force: true,
              ip: 'cron',
              userEmail: record.email,
              userId,
            },
            {
              db,
              schedule: async (task) => { await task(); },
            }
          );

          const scanId = (result.body as { id?: string }).id;
          rescans.push({ domain, status: result.status === 200 ? 'rescanned' : 'failed', scanId });
          if (result.status === 200) rescanCount++;
        } catch {
          rescans.push({ domain: record.domain, status: 'error' });
        }
      }
    } catch {
      rescans.push({ domain: '*', status: 'phase0 error' });
    }

    // ── Phase 1: Score alerts for monitored domains ──────────────
    const results: Array<{ domain: string; scanId?: string; score?: number; status: string }> = [];

    try {
      const monitoredForAlerts = await listActiveMonitoringDomains();

      for (const record of monitoredForAlerts) {
        try {
          const domain = getDomain(record.url);
          const latestScan = await db.findLatestScanByDomain(domain);
          if (!latestScan) {
            results.push({ domain, status: 'no scan found' });
            continue;
          }

          const scoreResult = latestScan.scoreResult as { percentage?: number } | undefined;
          const currentScore = scoreResult?.percentage ?? 0;
          const alertThreshold = record.alertThreshold ?? 50;

          results.push({
            domain,
            scanId: latestScan.id,
            score: currentScore,
            status: 'checked',
          });

          if (currentScore < alertThreshold) {
            await alertService.sendScoreAlert({
              domain,
              previousScore: currentScore,
              currentScore,
              threshold: alertThreshold,
              recipientEmail: record.email || latestScan.email || 'unknown',
            });
          }
        } catch {
          results.push({ domain: record.domain, status: 'error' });
        }
      }
    } catch {
      results.push({ domain: '*', status: 'phase1 error' });
    }

    // ── Phase 1b: AI opportunity alerts ───────────────────────────
    const opportunityAlerts: Array<{ domain: string; status: string; scanId?: string }> = [];

    try {
      const monitoredForOpportunities = await listActiveMonitoringDomains();

      for (const record of monitoredForOpportunities) {
        try {
          const domain = getDomain(record.url);

          if (!record.opportunityAlertsEnabled) {
            opportunityAlerts.push({ domain, status: 'disabled' });
            continue;
          }

          const summary = await getOpportunityAlertSummary({
            domain,
            userEmail: record.email,
            fallbackScanId: record.scanId,
          });

          if (!summary) {
            opportunityAlerts.push({ domain, status: 'below threshold' });
            continue;
          }

          if (summary.topPages.length === 0) {
            opportunityAlerts.push({ domain, status: 'no qualifying pages' });
            continue;
          }

          if (!hasOpportunityAlertCooldownElapsed(record.lastOpportunityAlertAt)) {
            opportunityAlerts.push({ domain, status: 'cooldown active', scanId: summary.latestScanId ?? undefined });
            continue;
          }

          await alertService.sendOpportunityAlert({
            recipientEmail: record.email || 'unknown',
            summary,
          });

          await updateMonitoringDomain(domain, record.email, {
            lastOpportunityAlertAt: Date.now(),
          });

          opportunityAlerts.push({ domain, status: 'sent', scanId: summary.latestScanId ?? undefined });
        } catch {
          opportunityAlerts.push({ domain: record.domain, status: 'error' });
        }
      }
    } catch {
      opportunityAlerts.push({ domain: '*', status: 'phase1b error' });
    }

    // ── Phase 2: Prompt monitoring loop ──────────────────────────
    const pm = getPromptMonitoring();
    const tester = getMentionTester();
    const allEngines = tester.availableEngines();
    const promptRuntimeCache = new Map<string, {
      engines: AIEngine[];
      primaryRegionId: string;
      blocked: boolean;
    }>();
    let promptsChecked = 0;
    let promptErrors = 0;

    try {
      const activeDomains = await pm.listActiveDomainsWithPrompts();

      for (const domain of activeDomains) {
        const prompts = await pm.listPrompts(domain);
        const active = prompts.filter((p) => p.active);
        if (active.length === 0) continue;

        for (const prompt of active) {
          let promptEngines: AIEngine[] = allEngines;
          let primaryRegionId = DEFAULT_REGION_ID;

          try {
            const cacheKey = `${prompt.userId}:${domain}`;
            const cached = promptRuntimeCache.get(cacheKey);

            if (cached) {
              promptEngines = cached.engines;
              primaryRegionId = cached.primaryRegionId;
              if (cached.blocked) continue;
            } else if (prompt.userId) {
              const supabase = getSupabaseClient();
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('id', prompt.userId)
                .single();

              if (profile?.email) {
                const [access, selectedPlatforms, selectedRegions, readiness] = await Promise.all([
                  getUserAccess(prompt.userId, profile.email),
                  getSelectedPlatforms(prompt.userId, domain),
                  getSelectedRegions(prompt.userId, domain),
                  getCurrentBillingReadiness(prompt.userId, profile.email),
                ]);

                const issues = readiness.snapshot.issues;
                const blocked = issues.some((issue) => (
                  issue.memberUserId === prompt.userId
                  && (
                    issue.category === 'prompts'
                    || (issue.category === 'platforms' && issue.domain === domain)
                    || (issue.category === 'regions' && issue.domain === domain)
                  )
                ));

                promptEngines = blocked
                  ? []
                  : getScannableEngines(selectedPlatforms, access.tier, allEngines);
                primaryRegionId = selectedRegions?.[0] ?? DEFAULT_REGION_ID;
                promptRuntimeCache.set(cacheKey, {
                  engines: promptEngines,
                  primaryRegionId,
                  blocked,
                });
                if (blocked) continue;
              }
            }
          } catch {
            // Fall through to all available engines if lookup fails
          }

          const regionText = applyRegionContext(prompt.promptText, primaryRegionId);
          const mentionPrompt: MentionPrompt = {
            id: prompt.id,
            text: regionText,
            category: isValidCategory(prompt.category) ? prompt.category : 'direct',
            industry: prompt.industry ?? '',
          };

          for (const engine of promptEngines) {
            try {
              const response = await tester.query(engine, mentionPrompt);
              const analysis = analyzeResponse(response, domain, domain);

              await pm.savePromptResult({
                promptId: prompt.id,
                domain,
                engine,
                mentioned: analysis.mentioned,
                position: analysis.position,
                sentiment: analysis.sentiment,
                citationPresent: analysis.citationPresent,
                citationUrls: analysis.citationUrls,
                rawSnippet: analysis.rawSnippet,
                testedAt: new Date().toISOString(),
              });

              // Save competitor appearances
              const weekStart = getWeekStart();
              for (const comp of analysis.competitors) {
                try {
                  await pm.saveCompetitorAppearance({
                    domain,
                    competitor: comp,
                    competitorDomain: null,
                    engine,
                    promptId: prompt.id,
                    position: null,
                    coMentioned: analysis.mentioned,
                    weekStart,
                  });
                } catch {
                  // non-critical — don't break on competitor save failure
                }
              }

              promptsChecked++;
            } catch {
              promptErrors++;
            }
          }
        }
      }
    } catch {
      // Prompt monitoring failure shouldn't break the entire cron
      promptErrors++;
    }

    return NextResponse.json({
      rescans,
      checked: results.length,
      results,
      opportunityAlerts,
      promptMonitoring: {
        promptsChecked,
        promptErrors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Monitoring check failed', detail: String(err) },
      { status: 500 }
    );
  }
}
