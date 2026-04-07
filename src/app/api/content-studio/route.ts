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

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('content_studio_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('domain', domain.trim().toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
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

  const { domain, title, content_type, topic, audience_id, tone, length, perspective, sections, cta_text, additional_instructions } = body;

  if (!domain || !title) {
    return NextResponse.json({ error: 'domain and title are required.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('content_studio_items')
    .insert({
      user_id: user.id,
      domain: String(domain).trim().toLowerCase(),
      title: String(title).trim(),
      content_type: String(content_type ?? 'blog_post'),
      topic: topic ? String(topic) : null,
      audience_id: audience_id ? String(audience_id) : null,
      tone: String(tone ?? 'professional'),
      length: String(length ?? 'medium'),
      perspective: String(perspective ?? 'second'),
      sections: sections ?? [],
      cta_text: cta_text ? String(cta_text) : null,
      additional_instructions: additional_instructions ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
