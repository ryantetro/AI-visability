import { NextRequest, NextResponse, after } from 'next/server';
import { getDatabase, getAlertService, getPromptMonitoring } from '@/lib/services/registry';
import { listActiveMonitoringDomains, updateMonitoringDomain } from '@/lib/monitoring';
import { getOpportunityAlertSummary, hasOpportunityAlertCooldownElapsed } from '@/lib/opportunity-alerts';
import { runPromptMonitoringForDomain } from '@/lib/prompt-monitoring';
import { startScan } from '@/lib/scan-workflow';
import { getSupabaseClient } from '@/lib/supabase';
import { getDomain } from '@/lib/url-utils';

/** Serverless wall-clock limit (seconds). Vercel Pro caps most routes at 300s — heavy cron work must stay under this. */
export const maxDuration = 300;

const RESCAN_STALENESS_MS = 24 * 60 * 60 * 1000; // 24 hours
const CRON_RESPONSE_BUFFER_MS = 30_000;

interface CronPromptMonitoringSummary {
  promptsChecked: number;
  promptErrors: number;
  engineCallsThisRun: number;
  successfulEngineCallsThisRun: number;
  budgetExhausted: boolean;
  engineCallBudget: number;
  runtimeBudgetMs: number;
  mode: 'inline' | 'background';
  queued: boolean;
}

/** Site rescans run in background via after(). Default 10 per cron run, override 0–50 via CRON_MAX_RESCANS_PER_RUN. */
function getCronMaxRescansPerRun(): number {
  const raw = process.env.CRON_MAX_RESCANS_PER_RUN;
  if (raw === undefined || raw === '') return 10;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 10;
  return Math.min(50, Math.max(0, n));
}

/** Cap AI engine calls in Phase 2 per cron invocation (each prompt × engine). Increase via CRON_MAX_PROMPT_ENGINE_CALLS if your platform allows longer functions. */
function getCronMaxPromptEngineCalls(): number {
  const raw = process.env.CRON_MAX_PROMPT_ENGINE_CALLS;
  const fallback = 20;
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(400, n);
}

/** Reserve time for response serialization and non-prompt cron phases before the route hits maxDuration. */
function getCronPromptMonitoringMaxRuntimeMs(): number {
  const raw = process.env.CRON_PROMPT_MONITORING_MAX_RUNTIME_MS;
  const fallback = Math.max(10_000, (maxDuration * 1000) - CRON_RESPONSE_BUFFER_MS);
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min((maxDuration * 1000) - 5_000, Math.max(5_000, n));
}

function shouldRunPromptMonitoringInline(): boolean {
  const raw = process.env.CRON_PROMPT_MONITORING_MODE?.trim().toLowerCase();
  if (raw === 'inline') return true;
  if (raw === 'background') return false;
  return process.env.NODE_ENV === 'test';
}

function createPromptMonitoringSummary(
  maxPromptEngineCalls: number,
  promptMonitoringMaxRuntimeMs: number,
  mode: 'inline' | 'background',
): CronPromptMonitoringSummary {
  return {
    promptsChecked: 0,
    promptErrors: 0,
    engineCallsThisRun: 0,
    successfulEngineCallsThisRun: 0,
    budgetExhausted: false,
    engineCallBudget: maxPromptEngineCalls,
    runtimeBudgetMs: promptMonitoringMaxRuntimeMs,
    mode,
    queued: false,
  };
}

async function runPromptMonitoringCronPhase({
  activeDomains,
  maxPromptEngineCalls,
  deadlineAt,
}: {
  activeDomains: string[];
  maxPromptEngineCalls: number;
  deadlineAt: number;
}) {
  let promptsChecked = 0;
  let promptErrors = 0;
  let promptEngineCalls = 0;
  let successfulPromptEngineCalls = 0;
  let promptMonitoringBudgetExhausted = false;

  domainLoop: for (const domain of activeDomains) {
    if (promptMonitoringBudgetExhausted) break domainLoop;
    if (Date.now() >= deadlineAt) {
      promptMonitoringBudgetExhausted = true;
      break domainLoop;
    }

    const remainingBudget = maxPromptEngineCalls - promptEngineCalls;
    if (remainingBudget <= 0) {
      promptMonitoringBudgetExhausted = true;
      break domainLoop;
    }

    const summary = await runPromptMonitoringForDomain({
      domain,
      maxEngineCalls: remainingBudget,
      deadlineAt,
    });

    promptsChecked += summary.promptsChecked;
    promptErrors += summary.promptErrors;
    promptEngineCalls += summary.engineCalls;
    successfulPromptEngineCalls += summary.successfulEngineCalls;

    if (summary.budgetExhausted || promptEngineCalls >= maxPromptEngineCalls) {
      promptMonitoringBudgetExhausted = true;
      break domainLoop;
    }
  }

  return {
    promptsChecked,
    promptErrors,
    promptEngineCalls,
    successfulPromptEngineCalls,
    promptMonitoringBudgetExhausted,
  };
}

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

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.MONITORING_SECRET;
  const promptMonitoringMaxRuntimeMs = getCronPromptMonitoringMaxRuntimeMs();
  const promptMonitoringMode = shouldRunPromptMonitoringInline() ? 'inline' : 'background';

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  const alertService = getAlertService();

  try {
    // ── Phase 0: Automated re-scans for score trending ──────────
    const rescans: Array<{ domain: string; status: string; scanId?: string }> = [];
    const queuedRescans: Array<{
      domain: string;
      record: { url: string; email: string };
      userId: string;
      summaryIndex: number;
    }> = [];

    try {
      const monitoredDomains = await listActiveMonitoringDomains();
      let rescanCount = 0;
      const maxRescans = getCronMaxRescansPerRun();

      for (const record of monitoredDomains) {
        try {
          const domain = getDomain(record.url);
          const latestScan = await db.findLatestScanByDomain(domain);
          const lastCompleted = latestScan?.completedAt ?? 0;

          if (Date.now() - lastCompleted < RESCAN_STALENESS_MS) {
            rescans.push({ domain, status: 'recent, skipping' });
            continue;
          }

          if (rescanCount >= maxRescans) {
            rescans.push({ domain, status: 'limit reached, skipping' });
            continue;
          }

          const userId = await getUserIdByEmail(record.email);
          if (!userId) {
            rescans.push({ domain, status: 'no user found, skipping' });
            continue;
          }

          const summaryIndex = rescans.push({ domain, status: 'queued' }) - 1;
          queuedRescans.push({
            domain,
            record: {
              url: record.url,
              email: record.email,
            },
            userId,
            summaryIndex,
          });
          rescanCount++;
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
    const maxPromptEngineCalls = getCronMaxPromptEngineCalls();
    const promptMonitoring = createPromptMonitoringSummary(
      maxPromptEngineCalls,
      promptMonitoringMaxRuntimeMs,
      promptMonitoringMode,
    );

    try {
      const activeDomains = await pm.listActiveDomainsWithPrompts();

      if (activeDomains.length > 0) {
        if (promptMonitoringMode === 'inline') {
          const summary = await runPromptMonitoringCronPhase({
            activeDomains,
            maxPromptEngineCalls,
            deadlineAt: startedAt + promptMonitoringMaxRuntimeMs,
          });
          promptMonitoring.promptsChecked = summary.promptsChecked;
          promptMonitoring.promptErrors = summary.promptErrors;
          promptMonitoring.engineCallsThisRun = summary.promptEngineCalls;
          promptMonitoring.successfulEngineCallsThisRun = summary.successfulPromptEngineCalls;
          promptMonitoring.budgetExhausted = summary.promptMonitoringBudgetExhausted;
        } else {
          promptMonitoring.queued = true;
          after(async () => {
            try {
              const summary = await runPromptMonitoringCronPhase({
                activeDomains,
                maxPromptEngineCalls,
                deadlineAt: startedAt + promptMonitoringMaxRuntimeMs,
              });
              console.info(
                `[cron-monitor] prompt monitoring complete checked=${summary.promptsChecked} errors=${summary.promptErrors} calls=${summary.promptEngineCalls} ok=${summary.successfulPromptEngineCalls} budgetExhausted=${summary.promptMonitoringBudgetExhausted}`,
              );
            } catch (error) {
              console.error('[cron-monitor] prompt monitoring background run failed', error);
            }
          });
        }
      }
    } catch {
      // Prompt monitoring failure shouldn't break the entire cron
      promptMonitoring.promptErrors += 1;
    }

    for (const queued of queuedRescans) {
      try {
        const result = await startScan(
          {
            url: queued.record.url,
            force: true,
            ip: 'cron',
            userEmail: queued.record.email,
            userId: queued.userId,
          },
          {
            db,
            schedule: (task) => { after(task); },
          }
        );

        const scanId = (result.body as { id?: string }).id;
        rescans[queued.summaryIndex] = {
          domain: queued.domain,
          status: result.status === 200 ? 'triggered' : 'failed',
          scanId,
        };
      } catch {
        rescans[queued.summaryIndex] = { domain: queued.domain, status: 'error' };
      }
    }

    return NextResponse.json({
      rescans,
      checked: results.length,
      results,
      opportunityAlerts,
      promptMonitoring,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Monitoring check failed', detail: String(err) },
      { status: 500 }
    );
  }
}
