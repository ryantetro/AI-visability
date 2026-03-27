import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  await supabase
    .from('user_profiles')
    .update({ trim_banner_dismissed: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
