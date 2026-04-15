import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { getUserAccess } from '@/lib/access';
import { getEffectiveUserIds } from '@/lib/team-management';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getSupabaseClient();

  // Get all team member IDs for shared domain access
  const userIds = await getEffectiveUserIds(user.id);

  const { data, error } = await supabase
    .from('user_domains')
    .select('domain')
    .in('user_id', userIds)
    .eq('hidden', false)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load domains' }, { status: 500 });
  }

  return NextResponse.json({ domains: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { domain, url } = body;

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const normalized = domain.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalized)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  // Enforce plan-based domain limit (counted across all team members)
  const access = await getUserAccess(user.id, user.email);
  const maxDomains = access.maxDomains;

  const supabase = getSupabaseClient();
  const userIds = await getEffectiveUserIds(user.id);
  const { count } = await supabase
    .from('user_domains')
    .select('id', { count: 'exact', head: true })
    .in('user_id', userIds)
    .eq('hidden', false);

  if ((count ?? 0) >= maxDomains) {
    return NextResponse.json(
      { error: `Your ${access.tier} plan allows ${maxDomains} domain${maxDomains === 1 ? '' : 's'}. Upgrade for more.` },
      { status: 403 }
    );
  }

  // Upsert: if domain was previously hidden, unhide it
  const { error } = await supabase
    .from('user_domains')
    .upsert(
      { user_id: user.id, domain: normalized, url: url || null, hidden: false, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,domain' }
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, domain: normalized });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { domain } = body;

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  // Soft-delete: set hidden=true
  const { error } = await supabase
    .from('user_domains')
    .update({ hidden: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('domain', domain.trim().toLowerCase());

  if (error) {
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
