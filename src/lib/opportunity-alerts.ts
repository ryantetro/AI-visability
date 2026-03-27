import { AI_CRAWLER_PROVIDER_ORDER, getCrawlerProvider, type AiCrawlerProvider } from '@/lib/ai-crawlers';
import { getCrawlerVisits, getDatabase, getReferralVisits } from '@/lib/services/registry';
import type {
  CrawlerVisit,
  OpportunityAlertPageSummary,
  OpportunityAlertProviderSummary,
  OpportunityAlertSummary,
  ReferralVisit,
} from '@/types/services';

export const OPPORTUNITY_ALERT_WINDOW_DAYS = 30;
export const OPPORTUNITY_ALERT_MIN_CRAWLER_VISITS = 25;
export const OPPORTUNITY_ALERT_MAX_REFERRAL_VISITS = 2;
export const OPPORTUNITY_ALERT_MIN_RATIO = 20;
export const OPPORTUNITY_ALERT_MIN_PAGE_CRAWLS = 3;
export const OPPORTUNITY_ALERT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function normalizePath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function summarizeProviders(crawlerVisits: CrawlerVisit[]): OpportunityAlertProviderSummary[] {
  const counts = new Map<AiCrawlerProvider, number>();

  for (const visit of crawlerVisits) {
    const provider = getCrawlerProvider(visit.botName);
    counts.set(provider, (counts.get(provider) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([provider, visits]) => ({ provider, visits }))
    .sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      return AI_CRAWLER_PROVIDER_ORDER.indexOf(a.provider) - AI_CRAWLER_PROVIDER_ORDER.indexOf(b.provider);
    })
    .slice(0, 3);
}

function summarizePages(
  crawlerVisits: CrawlerVisit[],
  referralVisits: ReferralVisit[]
): OpportunityAlertPageSummary[] {
  const pages = new Map<string, OpportunityAlertPageSummary>();

  for (const visit of crawlerVisits) {
    const path = normalizePath(visit.pagePath);
    const current = pages.get(path) ?? { path, crawlerVisits: 0, referralVisits: 0 };
    current.crawlerVisits += 1;
    pages.set(path, current);
  }

  for (const visit of referralVisits) {
    const path = normalizePath(visit.landingPage);
    const current = pages.get(path) ?? { path, crawlerVisits: 0, referralVisits: 0 };
    current.referralVisits += 1;
    pages.set(path, current);
  }

  return Array.from(pages.values())
    .filter((page) => page.crawlerVisits >= OPPORTUNITY_ALERT_MIN_PAGE_CRAWLS)
    .sort((a, b) => {
      if (b.crawlerVisits !== a.crawlerVisits) return b.crawlerVisits - a.crawlerVisits;
      if (a.referralVisits !== b.referralVisits) return a.referralVisits - b.referralVisits;
      return a.path.localeCompare(b.path);
    })
    .slice(0, 3);
}

export function hasOpportunityAlertCooldownElapsed(
  lastOpportunityAlertAt: number | null | undefined,
  now = Date.now()
) {
  if (!lastOpportunityAlertAt) return true;
  return now - lastOpportunityAlertAt >= OPPORTUNITY_ALERT_COOLDOWN_MS;
}

export function buildOpportunityAlertSummary(input: {
  domain: string;
  latestScanId: string | null;
  crawlerVisits: CrawlerVisit[];
  referralVisits: ReferralVisit[];
}): OpportunityAlertSummary | null {
  const totalCrawlerVisits = input.crawlerVisits.length;
  const totalReferralVisits = input.referralVisits.length;

  if (totalCrawlerVisits < OPPORTUNITY_ALERT_MIN_CRAWLER_VISITS) {
    return null;
  }

  if (totalReferralVisits > OPPORTUNITY_ALERT_MAX_REFERRAL_VISITS) {
    return null;
  }

  if (totalReferralVisits > 0 && (totalCrawlerVisits / totalReferralVisits) < OPPORTUNITY_ALERT_MIN_RATIO) {
    return null;
  }

  return {
    domain: input.domain,
    latestScanId: input.latestScanId,
    crawlerVisits: totalCrawlerVisits,
    referralVisits: totalReferralVisits,
    topProviders: summarizeProviders(input.crawlerVisits),
    topPages: summarizePages(input.crawlerVisits, input.referralVisits),
  };
}

export async function getOpportunityAlertSummary(params: {
  domain: string;
  userEmail?: string;
  fallbackScanId?: string | null;
}): Promise<OpportunityAlertSummary | null> {
  const db = getDatabase();
  const crawlerVisits = getCrawlerVisits();
  const referralVisits = getReferralVisits();

  const [crawler, referrals, latestScan] = await Promise.all([
    crawlerVisits.listVisits(params.domain, OPPORTUNITY_ALERT_WINDOW_DAYS),
    referralVisits.listVisits(params.domain, OPPORTUNITY_ALERT_WINDOW_DAYS),
    db.findLatestScanByDomain(params.domain, params.userEmail),
  ]);

  return buildOpportunityAlertSummary({
    domain: params.domain,
    latestScanId: latestScan?.id ?? params.fallbackScanId ?? null,
    crawlerVisits: crawler,
    referralVisits: referrals,
  });
}
