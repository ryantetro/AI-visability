import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE_NAME, setAuthCookies, clearAuthCookies } from '@/lib/auth';
import { getSupabaseAnonClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token.' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const response = NextResponse.json({ error: 'Refresh failed.' }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, data.session.access_token, data.session.refresh_token);
    return response;
  } catch {
    const response = NextResponse.json({ error: 'Refresh failed.' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
