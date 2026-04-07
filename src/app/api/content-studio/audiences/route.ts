import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('content_studio')) {
    return NextResponse.json({ error: 'Content Studio requires a Pro plan or higher.' }, { status: 403 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('content_studio_audiences')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ audiences: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('content_studio')) {
    return NextResponse.json({ error: 'Content Studio requires a Pro plan or higher.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, description } = body;
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return NextResponse.json({ error: 'name is required.' }, { status: 400 });
  }
  if (String(name).length > 200) {
    return NextResponse.json({ error: 'name must be 200 characters or fewer.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('content_studio_audiences')
    .insert({
      user_id: user.id,
      name: String(name).trim(),
      description: description ? String(description) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
