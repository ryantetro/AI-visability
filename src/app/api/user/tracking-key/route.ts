import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { getDomain } from '@/lib/url-utils';

function isValidDomain(domain: string) {
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain);
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function generateSiteKey() {
  return `stk_${randomBytes(16).toString('hex')}`;
}

async function ensureUserOwnsDomain(userId: string, email: string, domain: string) {
  const supabase = getSupabaseClient();
  const { data: savedDomain, error: savedDomainError } = await supabase
    .from('user_domains')
    .select('domain')
    .eq('user_id', userId)
    .eq('domain', domain)
    .eq('hidden', false)
    .maybeSingle();

  if (savedDomainError) {
    throw new Error('Failed to validate domain.');
  }

  if (savedDomain) {
    return true;
  }

  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('url')
    .eq('email', email.toLowerCase())
    .limit(200);

  if (scansError) {
    throw new Error('Failed to validate domain.');
  }

  return (scans ?? []).some((scan) => {
    const url = typeof scan.url === 'string' ? scan.url : '';
    if (!url) return false;
    try {
      return getDomain(url) === domain;
    } catch {
      return false;
    }
  });
}

async function createOrReplaceTrackingKey(userId: string, domain: string) {
  const supabase = getSupabaseClient();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const siteKey = generateSiteKey();
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('site_tracking_keys')
      .upsert(
        {
          user_id: userId,
          domain,
          site_key: siteKey,
          created_at: createdAt,
          last_used_at: null,
        },
        { onConflict: 'user_id,domain' }
      )
      .select('site_key, domain, created_at, last_used_at')
      .single();

    if (!error && data) {
      return {
        siteKey: data.site_key,
        domain: data.domain,
        createdAt: data.created_at,
        lastUsedAt: data.last_used_at ?? null,
      };
    }

    if (!error || (error.code !== '23505' && !/duplicate key value/i.test(error.message))) {
      throw new Error('Failed to save tracking key.');
    }
  }

  throw new Error('Failed to generate a unique tracking key.');
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const rawDomain = request.nextUrl.searchParams.get('domain') ?? '';
  const domain = normalizeDomain(rawDomain);
  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const ownsDomain = await ensureUserOwnsDomain(user.id, user.email, domain);
    if (!ownsDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('site_tracking_keys')
      .select('site_key, domain, created_at, last_used_at')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to load tracking key' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ siteKey: null, lastUsedAt: null });
    }

    return NextResponse.json({
      siteKey: data.site_key,
      domain: data.domain,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load tracking key' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawDomain = typeof body?.domain === 'string' ? body.domain : '';
  const domain = normalizeDomain(rawDomain);
  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const ownsDomain = await ensureUserOwnsDomain(user.id, user.email, domain);
    if (!ownsDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const trackingKey = await createOrReplaceTrackingKey(user.id, domain);
    return NextResponse.json(trackingKey);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save tracking key' },
      { status: 500 }
    );
  }
}
