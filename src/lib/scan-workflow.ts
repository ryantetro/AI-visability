import { randomUUID } from 'node:crypto';
import { crawlSite } from '@/lib/crawler';
import { scoreCrawlData } from '@/lib/scorer';
import { getDatabase } from '@/lib/services/registry';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';
import { checkScanRateLimit, recordScanRequest } from '@/lib/scan-rate-limit';
import { DatabaseService } from '@/types/services';
import { ScanJob, ScanProgress } from '@/types/scan';

export interface StartScanInput {
  url: string;
  force?: boolean;
  ip: string;
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
      { label: 'Checking robots.txt', status: 'pending' },
      { label: 'Checking sitemap.xml', status: 'pending' },
      { label: 'Checking llms.txt', status: 'pending' },
      { label: 'Crawling homepage', status: 'pending' },
      { label: 'Discovering pages', status: 'pending' },
      { label: 'Crawling additional pages', status: 'pending' },
      { label: 'Analyzing structured data', status: 'pending' },
      { label: 'Scoring AI visibility', status: 'pending' },
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
  { url, force = false, ip }: StartScanInput,
  { db = getDatabase(), now = Date.now(), schedule }: StartScanOptions = {}
): Promise<StartScanResult> {
  if (!url || !isValidUrl(url)) {
    return {
      status: 400,
      body: { error: 'Invalid URL' },
    };
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
      if (cached) {
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
      createdAt: now,
    };

    await db.saveScan(scan);
    if (enforceRateLimit) {
      recordScanRequest(ip, now);
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
      } else if (step.includes('llms') || step.includes('browser')) {
        await updateStep('done');
      } else if (step.includes('homepage') || step.includes('Crawling /')) {
        await updateStep('done');
      }
      await db.saveScan(scan);
    });

    for (let i = 0; i < 6; i += 1) {
      if (scan.progress.checks[i].status !== 'done') {
        scan.progress.checks[i].status = 'done';
      }
    }
    await db.saveScan(scan);

    scan.status = 'scoring';
    scan.progress.status = 'scoring';
    scan.progress.checks[6].status = 'running';
    await db.saveScan(scan);

    const scoreResult = scoreCrawlData(crawlData);

    scan.progress.checks[6].status = 'done';
    scan.progress.checks[7].status = 'running';
    await db.saveScan(scan);

    await new Promise((resolve) => setTimeout(resolve, 500));

    scan.progress.checks[7].status = 'done';
    scan.status = 'complete';
    scan.progress.status = 'complete';
    scan.crawlData = crawlData;
    scan.scoreResult = scoreResult;
    scan.completedAt = Date.now();
    await db.saveScan(scan);
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
