import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getDatabase, getPromptMonitoring, getCrawlerVisits, getReferralVisits } from '@/lib/services/registry';
import { generateCSV, csvResponse, jsonResponse, generateJSON } from '@/lib/export';

type ExportType = 'scans' | 'prompts' | 'crawler-visits' | 'referral-visits';
const VALID_TYPES = new Set<ExportType>(['scans', 'prompts', 'crawler-visits', 'referral-visits']);

/** Feature gate: which export types require which feature */
const EXPORT_GATES: Record<ExportType, string> = {
  scans: 'data_export',
  prompts: 'data_export',
  'crawler-visits': 'full_export',
  'referral-visits': 'full_export',
};

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type') as ExportType | null;
  const domain = request.nextUrl.searchParams.get('domain');
  const format = request.nextUrl.searchParams.get('format') ?? 'csv';

  if (!type || !VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: 'Invalid export type. Must be: scans, prompts, crawler-visits, or referral-visits' },
      { status: 400 }
    );
  }

  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  // Check feature gate
  const access = await getUserAccess(user.id, user.email);
  const requiredFeature = EXPORT_GATES[type];
  if (!access.canAccessFeature(requiredFeature)) {
    return NextResponse.json(
      { error: `Data export requires the ${requiredFeature === 'full_export' ? 'Growth' : 'Pro'} plan or above.` },
      { status: 403 }
    );
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const timestamp = new Date().toISOString().slice(0, 10);

  try {
    if (type === 'scans') {
      return await exportScans(user, domain, format, timestamp);
    } else if (type === 'prompts') {
      return await exportPrompts(user, domain, format, timestamp);
    } else if (type === 'crawler-visits') {
      return await exportCrawlerVisits(domain, days, format, timestamp);
    } else {
      return await exportReferralVisits(domain, days, format, timestamp);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

async function exportScans(
  user: { id: string; email: string },
  domain: string,
  format: string,
  timestamp: string
) {
  const db = getDatabase();
  const scans = await db.listCompletedScans(50, user.email);
  const domainScans = scans.filter((s) => {
    try {
      return new URL(s.url).hostname.replace(/^www\./, '') === domain;
    } catch {
      return false;
    }
  });

  const rows = domainScans.map((scan) => {
    const score = (scan.scoreResult as { percentage?: number })?.percentage ?? null;
    const mentionScore = (scan.mentionSummary as { overallScore?: number } | undefined)?.overallScore ?? null;
    return {
      id: scan.id,
      url: scan.url,
      status: scan.status,
      score,
      mention_score: mentionScore,
      created_at: new Date(scan.createdAt).toISOString(),
      completed_at: scan.completedAt ? new Date(scan.completedAt).toISOString() : '',
    };
  });

  const columns = [
    { key: 'id', label: 'Scan ID' },
    { key: 'url', label: 'URL' },
    { key: 'status', label: 'Status' },
    { key: 'score', label: 'Visibility Score' },
    { key: 'mention_score', label: 'Mention Score' },
    { key: 'created_at', label: 'Created At' },
    { key: 'completed_at', label: 'Completed At' },
  ];

  const filename = `aiso-scans-${domain}-${timestamp}`;
  if (format === 'json') {
    return jsonResponse(generateJSON(rows), `${filename}.json`);
  }
  return csvResponse(generateCSV(rows, columns), `${filename}.csv`);
}

async function exportPrompts(
  user: { id: string; email: string },
  domain: string,
  format: string,
  timestamp: string
) {
  const pm = getPromptMonitoring();
  const [prompts, results] = await Promise.all([
    pm.listPrompts(domain, user.id),
    pm.listPromptResults(domain, 500, user.id),
  ]);

  const rows = results.map((r) => {
    const prompt = prompts.find((p) => p.id === r.promptId);
    return {
      prompt_text: prompt?.promptText ?? '',
      category: prompt?.category ?? '',
      engine: r.engine,
      mentioned: r.mentioned ? 'Yes' : 'No',
      position: r.position ?? '',
      sentiment: r.sentiment ?? '',
      citation: r.citationPresent ? 'Yes' : 'No',
      tested_at: r.testedAt,
    };
  });

  const columns = [
    { key: 'prompt_text', label: 'Prompt' },
    { key: 'category', label: 'Category' },
    { key: 'engine', label: 'Engine' },
    { key: 'mentioned', label: 'Mentioned' },
    { key: 'position', label: 'Position' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'citation', label: 'Citation' },
    { key: 'tested_at', label: 'Tested At' },
  ];

  const filename = `aiso-prompts-${domain}-${timestamp}`;
  if (format === 'json') {
    return jsonResponse(generateJSON(rows), `${filename}.json`);
  }
  return csvResponse(generateCSV(rows, columns), `${filename}.csv`);
}

async function exportCrawlerVisits(
  domain: string,
  days: number,
  format: string,
  timestamp: string
) {
  const cv = getCrawlerVisits();
  const visits = await cv.listVisits(domain, days);

  const rows = visits.map((v) => ({
    bot_name: v.botName,
    bot_category: v.botCategory,
    page_path: v.pagePath,
    user_agent: v.userAgent ?? '',
    visited_at: v.visitedAt,
  }));

  const columns = [
    { key: 'bot_name', label: 'Bot Name' },
    { key: 'bot_category', label: 'Category' },
    { key: 'page_path', label: 'Page Path' },
    { key: 'user_agent', label: 'User Agent' },
    { key: 'visited_at', label: 'Visited At' },
  ];

  const filename = `aiso-crawler-visits-${domain}-${timestamp}`;
  if (format === 'json') {
    return jsonResponse(generateJSON(rows), `${filename}.json`);
  }
  return csvResponse(generateCSV(rows, columns), `${filename}.csv`);
}

async function exportReferralVisits(
  domain: string,
  days: number,
  format: string,
  timestamp: string
) {
  const rv = getReferralVisits();
  const visits = await rv.listVisits(domain, days);

  const rows = visits.map((v) => ({
    source_engine: v.sourceEngine,
    landing_page: v.landingPage,
    referrer_url: v.referrerUrl ?? '',
    visited_at: v.visitedAt,
  }));

  const columns = [
    { key: 'source_engine', label: 'Source Engine' },
    { key: 'landing_page', label: 'Landing Page' },
    { key: 'referrer_url', label: 'Referrer URL' },
    { key: 'visited_at', label: 'Visited At' },
  ];

  const filename = `aiso-referral-visits-${domain}-${timestamp}`;
  if (format === 'json') {
    return jsonResponse(generateJSON(rows), `${filename}.json`);
  }
  return csvResponse(generateCSV(rows, columns), `${filename}.csv`);
}
