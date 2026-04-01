import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getSupabaseClient } from '@/lib/supabase';
import { ensureOwnedDomain, parseStringArray } from '@/lib/optimize/shared';

function serializeRow(row: {
  tagline?: string | null;
  description?: string | null;
  differentiators_json?: unknown;
  target_audience?: string | null;
  category?: string | null;
  negative_associations_json?: unknown;
}) {
  return {
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    differentiators: parseStringArray(row.differentiators_json),
    targetAudience: row.target_audience ?? '',
    category: row.category ?? '',
    negativeAssociations: parseStringArray(row.negative_associations_json),
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const domain = await ensureOwnedDomain(user.id, request.nextUrl.searchParams.get('domain'));
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('brand_positioning')) {
    return NextResponse.json(
      { error: 'Brand positioning requires the Pro plan or above.' },
      { status: 403 },
    );
  }

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('brand_positioning')
      .select('tagline, description, differentiators_json, target_audience, category, negative_associations_json')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .maybeSingle();

    return NextResponse.json({
      positioning: serializeRow(data ?? {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load brand positioning' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const domain = await ensureOwnedDomain(user.id, body?.domain);
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('brand_positioning')) {
    return NextResponse.json(
      { error: 'Brand positioning requires the Pro plan or above.' },
      { status: 403 },
    );
  }

  const payload = {
    user_id: user.id,
    domain,
    tagline: typeof body?.tagline === 'string' ? body.tagline.trim() : null,
    description: typeof body?.description === 'string' ? body.description.trim() : null,
    differentiators_json: parseStringArray(body?.differentiators),
    target_audience: typeof body?.targetAudience === 'string' ? body.targetAudience.trim() : null,
    category: typeof body?.category === 'string' ? body.category.trim() : null,
    negative_associations_json: parseStringArray(body?.negativeAssociations),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('brand_positioning')
      .upsert(payload, { onConflict: 'user_id,domain' })
      .select('tagline, description, differentiators_json, target_audience, category, negative_associations_json')
      .maybeSingle();

    return NextResponse.json({
      positioning: serializeRow(data ?? payload),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save brand positioning' },
      { status: 500 },
    );
  }
}
