import { NextRequest, NextResponse } from 'next/server';
import { getCrawlerVisits } from '@/lib/services/registry';
import { getSupabaseClient } from '@/lib/supabase';

const HOUR_MS = 60 * 60 * 1000;
const DOMAIN_LIMIT_PER_HOUR = 500;
const TOUCH_INTERVAL_MS = HOUR_MS;
const VALID_CATEGORIES = new Set(['indexing', 'citation', 'training', 'unknown']);

type RateWindow = {
  count: number;
  startedAt: number;
};

const domainRateWindows = new Map<string, RateWindow>();
const recentKeyTouches = new Map<string, number>();

function isValidDomain(domain: string) {
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain);
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function normalizePath(path: unknown) {
  if (typeof path !== 'string') return '/';
  const trimmed = path.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function coerceCategory(category: unknown): 'indexing' | 'citation' | 'training' | 'unknown' {
  if (typeof category === 'string' && VALID_CATEGORIES.has(category)) {
    return category as 'indexing' | 'citation' | 'training' | 'unknown';
  }
  return 'unknown';
}

function checkDomainRateLimit(domain: string) {
  const now = Date.now();
  const existing = domainRateWindows.get(domain);

  if (!existing || now - existing.startedAt >= HOUR_MS) {
    domainRateWindows.set(domain, { count: 1, startedAt: now });
    return { allowed: true };
  }

  if (existing.count >= DOMAIN_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((HOUR_MS - (now - existing.startedAt)) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

async function maybeTouchTrackingKey(params: { id: string; lastUsedAt: string | null }) {
  const { id, lastUsedAt } = params;
  const now = Date.now();
  const recentTouch = recentKeyTouches.get(id);
  if (recentTouch && now - recentTouch < TOUCH_INTERVAL_MS) {
    return;
  }

  if (lastUsedAt) {
    const lastUsedMs = Date.parse(lastUsedAt);
    if (!Number.isNaN(lastUsedMs) && now - lastUsedMs < TOUCH_INTERVAL_MS) {
      recentKeyTouches.set(id, now);
      return;
    }
  }

  recentKeyTouches.set(id, now);
  const supabase = getSupabaseClient();
  await supabase
    .from('site_tracking_keys')
    .update({ last_used_at: new Date(now).toISOString() })
    .eq('id', id);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const siteKey = typeof body?.sk === 'string' ? body.sk.trim() : '';
  const botName = typeof body?.bn === 'string' ? body.bn.trim() : '';
  const botCategory = coerceCategory(body?.bc);
  const pagePath = normalizePath(body?.p);
  const userAgent = typeof body?.ua === 'string' ? body.ua.trim() : '';

  if (!siteKey || !botName) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data: trackingKey, error } = await supabase
    .from('site_tracking_keys')
    .select('id, domain, last_used_at')
    .eq('site_key', siteKey)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to validate tracking key.' }, { status: 500 });
  }

  if (!trackingKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const domain = normalizeDomain(trackingKey.domain);
  if (!isValidDomain(domain)) {
    return NextResponse.json({ error: 'Tracking key is misconfigured.' }, { status: 500 });
  }

  const rateLimit = checkDomainRateLimit(domain);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    );
  }

  const crawlerVisits = getCrawlerVisits();
  await crawlerVisits.logVisit({
    domain,
    botName,
    botCategory,
    pagePath,
    userAgent: userAgent || null,
    responseCode: null,
  });

  void maybeTouchTrackingKey({
    id: trackingKey.id,
    lastUsedAt: trackingKey.last_used_at ?? null,
  });

  return NextResponse.json({ ok: true });
}
