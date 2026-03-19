import { NextRequest, NextResponse } from 'next/server';
import { refreshRequestSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: false });
  const auth = await refreshRequestSession(request, response);

  if (!auth.user) {
    console.error('[auth.refresh] refresh failed', { reason: auth.reason ?? 'refresh_failed' });
    return NextResponse.json(
      { ok: false, error: auth.reason === 'no_session' ? 'No session.' : 'Refresh failed.' },
      { status: 401, headers: response.headers }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: auth.user,
      session: {
        expiresAt: auth.session?.expiresAt ?? null,
      },
    },
    { headers: response.headers }
  );
}
