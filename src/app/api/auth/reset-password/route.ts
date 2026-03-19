import { NextRequest, NextResponse } from 'next/server';
import {
  AuthActionError,
  completePasswordRecovery,
  sanitizeAuthUser,
  setSessionCookies,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, session } = await completePasswordRecovery(request, body.password || '');
    const response = NextResponse.json({
      user: sanitizeAuthUser(user),
      session: {
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      },
    });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    console.error('[auth.reset-password] password reset failed', error);
    return NextResponse.json(
      {
        code: error instanceof AuthActionError ? error.code : 'AUTH_ERROR',
        error: error instanceof Error ? error.message : 'Failed to reset your password.',
      },
      { status: 400 }
    );
  }
}
