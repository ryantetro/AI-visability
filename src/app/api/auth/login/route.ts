import { NextRequest, NextResponse } from 'next/server';
import { AuthActionError, sanitizeAuthUser, setSessionCookies, signInWithPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, session } = await signInWithPassword(body.email || '', body.password || '');
    const response = NextResponse.json({
      user: sanitizeAuthUser(user),
      session: {
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      },
    });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    console.error('[auth.login] sign-in failed', error);
    return NextResponse.json(
      {
        code: error instanceof AuthActionError ? error.code : 'AUTH_ERROR',
        error: error instanceof Error ? error.message : 'Failed to sign you in.',
      },
      { status: 400 }
    );
  }
}
