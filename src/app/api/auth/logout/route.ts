import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, clearSession } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Revoke the session server-side if we have a token
  if (token) {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.admin.signOut(token);
    } catch {
      console.error('[auth.logout] failed to revoke session server-side');
      // Best-effort: cookie will be cleared regardless
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSession(response);
  return response;
}
