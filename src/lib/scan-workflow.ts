import { randomUUID } from 'node:crypto';
import { crawlSite } from '@/lib/crawler';
import { scoreCrawlData } from '@/lib/scorer';
import { getDatabase, getMentionTester } from '@/lib/services/registry';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';
import { checkScanRateLimit, recordScanRequest } from '@/lib/scan-rate-limit';
import { runWebHealthEnrichment, createUnavailableWebHealth } from '@/lib/web-health';
import { runMentionTests } from '@/lib/ai-mentions';
import { AI_ENGINES } from '@/lib/ai-engines';
import { CrawlData } from '@/types/crawler';
import { DatabaseService } from '@/types/services';
import { ScanJob, ScanProgress } from '@/types/scan';
import { getOrCreateProfile, canUserScan, incrementScanCount, getUserUsage } from '@/lib/user-profile';
import { getUserAccess } from '@/lib/access';
import { getScannableEngines, getSelectedPlatforms } from '@/lib/platform-gating';
import type { MentionTesterService } from '@/lib/ai-mentions/engine-tester';

export interface StartScanInput {
  url: string;
  force?: boolean;
  ip: string;
  userEmail: string;
  userId: string;
}

export interface StartScanResult {
  body: Record<string, unknown>;
  status: number;
}

interface StartScanOptions {
  db?: DatabaseService;
  now?: number;
  schedule?: (task: () => Promise<void>) => void | Promise<void>;
}

export function initialProgress(): ScanProgress {
  return {
    status: 'pending',
    checks: [
      { label: 'Fetching robots.txt & sitemap', status: 'pending' },
      { label: 'Checking llms.txt', status: 'pending' },
      { label: 'Crawling pages', status: 'pending' },
      { label: 'Measuring performance', status: 'pending' },
      { label: 'Analyzing structured data', status: 'pending' },
      { label: 'Scoring AI visibility', status: 'pending' },
      { label: 'Testing AI mentions', status: 'pending' },
      { label: 'Checking Web Health', status: 'pending' },
      { label: 'Generating report', status: 'pending' },
    ],
  };
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function startScan(
  { url, force = false, ip, userEmail, userId }: StartScanInput,
  { db = getDatabase(), now = Date.now(), schedule }: StartScanOptions = {}
): Promise<StartScanResult> {
  if (!url || !isValidUrl(url)) {
    return {
      status: 400,
      body: { error: 'Invalid URL' },
    };
  }

  // Per-user scan limit check
  try {
    const profile = await getOrCreateProfile(userId, userEmail);
    if (!canUserScan()) {
      const usage = getUserUsage(profile);
      return {
        status: 403,
        body: {
          error: 'Free scan limit reached. Upgrade to continue.',
          upgradeRequired: true,
          used: usage.used,
          limit: usage.limit,
        },
      };
    }
  } catch {
    // If profile check fails, allow scan to proceed (fail open)
  }

  const enforceRateLimit = process.env.NODE_ENV !== 'development';

  if (enforceRateLimit) {
    const rateLimit = checkScanRateLimit(ip, now);
    if (!rateLimit.allowed) {
      return {
        status: 429,
        body: {
          error: 'Free audit limit reached for this IP. Try again later.',
          limit: rateLimit.limit,
          retryAfterSec: rateLimit.retryAfterSec,
        },
      };
    }
  }

  try {
    const normalized = normalizeUrl(url);

    if (!force) {
      const cached = await db.findScanByUrl(normalized);
      if (cached && cached.email?.toLowerCase() === userEmail.toLowerCase()) {
        if (enforceRateLimit) {
          recordScanRequest(ip, now);
        }
        return {
          status: 200,
          body: { id: cached.id, cached: true },
        };
      }
    }

    const id = randomUUID();
    const scan: ScanJob = {
      id,
      url,
      normalizedUrl: normalized,
      status: 'pending',
      progress: initialProgress(),
      enrichments: {
        webHealth: {
          status: 'pending',
        },
      },
      email: userEmail,
      createdAt: now,
    };

    await db.saveScan(scan);
    if (enforceRateLimit) {
      recordScanRequest(ip, now);
    }

    // Increment per-user scan count
    try {
      await incrementScanCount(userId);
    } catch {
      // Non-blocking: scan still proceeds if count update fails
    }

    if (schedule) {
      await schedule(async () => {
        await runScan(id, db);
      });
    }

    return {
      status: 200,
      body: { id, cached: false },
    };
  } catch {
    return {
      status: 500,
      body: { error: 'Failed to start scan' },
    };
  }
}

export async function runScan(scanId: string, db = getDatabase()) {
  const scan = await db.getScan(scanId);
  if (!scan) return;

  try {
    scan.status = 'crawling';
    scan.progress.status = 'crawling';
    await db.saveScan(scan);

    let stepIndex = 0;
    const updateStep = async (status: 'running' | 'done' | 'error') => {
      if (stepIndex < scan.progress.checks.length) {
        scan.progress.checks[stepIndex].status = status;
        if (status === 'done' || status === 'error') {
          stepIndex += 1;
        }
        if (stepIndex < scan.progress.checks.length && status === 'done') {
          scan.progress.checks[stepIndex].status = 'running';
        }
        await db.saveScan(scan);
      }
    };

    await updateStep('running');

    const crawlData = await crawlSite(scan.url, async (step: string) => {
      scan.progress.currentStep = step;
      if (step.includes('sitemap')) {
        await updateStep('done');
      } else if (step.includes('llms')) {
        await updateStep('done');
      } else if (step.includes('homepage') || step.includes('Crawling /') || step.includes('Launching browser')) {
        await updateStep('done');
      }
      await db.saveScan(scan);
    });

    for (let i = 0; i < 3; i += 1) {
      if (scan.progress.checks[i].status !== 'done') {
        scan.progress.checks[i].status = 'done';
      }
    }
    await db.saveScan(scan);

    scan.status = 'scoring';
    scan.progress.status = 'scoring';
    await db.saveScan(scan);

    const enrichmentStartedAt = Date.now();
    scan.enrichments = {
      webHealth: {
        status: 'running',
        startedAt: enrichmentStartedAt,
      },
    };
    scan.progress.checks[3].status = 'running';
    await db.saveScan(scan);

    const webHealthPromise = withTimeout(
      runWebHealthEnrichment(crawlData),
      15000,
      'Web Health enrichment timed out before completion.'
    ).catch((error) => createUnavailableWebHealth(String(error)));

    const scoreResult = scoreCrawlData(crawlData);

    scan.progress.checks[3].status = 'done';
    scan.progress.checks[4].status = 'done';
    scan.progress.checks[5].status = 'running';
    await db.saveScan(scan);

    await new Promise((resolve) => setTimeout(resolve, 500));

    scan.progress.checks[5].status = 'done';

    // AI Mention testing step
    scan.progress.checks[6].status = 'running';
    await db.saveScan(scan);

    try {
      const mentionTester = getMentionTester();
      const allAvailable = mentionTester.availableEngines();

      // Apply platform gating: filter engines to user's selected/allowed platforms
      let filteredEngines = allAvailable;
      try {
        if (scan.email) {
          const supabase = await import('@/lib/supabase').then((m) => m.getSupabaseClient());
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', scan.email.toLowerCase())
            .single();

          if (profile?.id) {
            const domain = new URL(scan.url).hostname.replace(/^www\./, '');
            const access = await getUserAccess(profile.id, scan.email);
            const selectedPlatforms = await getSelectedPlatforms(profile.id, domain);
            filteredEngines = getScannableEngines(selectedPlatforms, access.tier, allAvailable);
          }
        }
      } catch {
        // Platform gating lookup failed — fall through to all available engines
      }

      // Create a filtered tester that only exposes the allowed engines
      const filteredTester: MentionTesterService = {
        query: (engine, prompt) => mentionTester.query(engine, prompt),
        availableEngines: () => filteredEngines,
      };

      const disabledEngines = AI_ENGINES.filter((engine) => !filteredEngines.includes(engine));
      console.log(`[scan-workflow] Starting AI mention testing. Engines: ${filteredEngines.join(', ') || 'none'}. Excluded: ${disabledEngines.join(', ') || 'none'}.`);
      const mentionSummary = await withTimeout(
        runMentionTests(crawlData, filteredTester),
        120000,
        'AI mention testing timed out.'
      );
      console.log('[scan-workflow] AI mention testing complete, score:', mentionSummary.overallScore);
      scan.mentionSummary = mentionSummary;
      scan.progress.checks[6].status = 'done';
    } catch (err) {
      console.error('[scan-workflow] AI mention testing failed:', err);
      scan.progress.checks[6].status = 'error';
    }
    await db.saveScan(scan);

    scan.progress.checks[7].status = 'running';
    scan.progress.checks[8].status = 'running';
    scan.status = 'complete';
    scan.progress.status = 'complete';
    scan.crawlData = crawlData;
    scan.scoreResult = scoreResult;
    scan.completedAt = Date.now();
    await db.saveScan(scan);

    void finalizeWebHealthEnrichment({
      scanId,
      db,
      crawlData,
      startedAt: enrichmentStartedAt,
      webHealthPromise,
    });
  } catch (err) {
    scan.status = 'failed';
    scan.progress.status = 'failed';
    scan.progress.error = String(err);
    for (const check of scan.progress.checks) {
      if (check.status === 'running') {
        check.status = 'error';
      }
    }
    await db.saveScan(scan);
  }
}

async function finalizeWebHealthEnrichment({
  scanId,
  db,
  crawlData,
  startedAt,
  webHealthPromise,
}: {
  scanId: string;
  db: DatabaseService;
  crawlData: CrawlData;
  startedAt: number;
  webHealthPromise: Promise<Awaited<ReturnType<typeof runWebHealthEnrichment>>>;
}) {
  const webHealth = await webHealthPromise;
  const latest = await db.getScan(scanId);
  if (!latest || latest.status !== 'complete') {
    return;
  }

  latest.enrichments = {
    webHealth: {
      status: webHealth.status === 'complete' ? 'complete' : 'unavailable',
      startedAt,
      completedAt: Date.now(),
      error: webHealth.error,
    },
  };
  latest.progress.checks[7].status = webHealth.status === 'complete' ? 'done' : 'error';
  latest.progress.checks[8].status = 'done';
  latest.scoreResult = scoreCrawlData(crawlData, webHealth);
  await db.saveScan(latest);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
