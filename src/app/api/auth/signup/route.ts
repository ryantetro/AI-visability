import { NextRequest, NextResponse } from 'next/server';
import { AuthActionError, sanitizeAuthUser, setSessionCookies, signUpWithPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, session, requiresEmailVerification } = await signUpWithPassword(
      body.email || '',
      body.password || '',
      {
        name: body.name || '',
        next: body.next || null,
        scanUrl: body.scanUrl || null,
      }
    );

    const response = NextResponse.json({
      user: sanitizeAuthUser(user),
      requiresEmailVerification,
      session: session?.expires_at ? {
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
      } : null,
    });

    if (session) {
      setSessionCookies(response, session);
    }

    return response;
  } catch (error) {
    console.error('[auth.signup] sign-up failed', error);
    return NextResponse.json(
      {
        code: error instanceof AuthActionError ? error.code : 'AUTH_ERROR',
        error: error instanceof Error ? error.message : 'Failed to create your account.',
      },
      { status: 400 }
    );
  }
}
