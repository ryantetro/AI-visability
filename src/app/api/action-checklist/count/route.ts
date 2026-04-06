import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getChecklistCount } from '@/lib/services/supabase-action-checklist';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query param is required.' }, { status: 400 });
  }

  try {
    const result = await getChecklistCount(user.id, domain);
    return NextResponse.json(result);
  } catch (err) {
    console.error('action-checklist count error:', err);
    return NextResponse.json({ error: 'Failed to get count.' }, { status: 500 });
  }
}
