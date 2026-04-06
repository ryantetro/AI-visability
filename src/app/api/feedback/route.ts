import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

const ADMIN_EMAIL = 'ryantetro@gmail.com';
const ALLOWED_CATEGORIES = ['bug', 'feature', 'general'] as const;

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { message, category, pageUrl } = body as {
    message?: string;
    category?: string;
    pageUrl?: string;
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message must be 2000 characters or fewer.' }, { status: 400 });
  }

  const resolvedCategory = ALLOWED_CATEGORIES.includes(category as typeof ALLOWED_CATEGORIES[number])
    ? category
    : 'general';

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('user_feedback').insert({
    user_id: user.id,
    user_email: user.email,
    user_name: user.name || null,
    category: resolvedCategory,
    message: message.trim(),
    page_url: pageUrl || null,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load feedback.' }, { status: 500 });
  }

  return NextResponse.json({ feedback: data });
}
