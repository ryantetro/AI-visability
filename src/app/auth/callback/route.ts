import { NextRequest, NextResponse } from 'next/server';
import {
  buildPostAuthRedirectPath,
  sanitizeRedirectPath,
  setSessionCookies,
  verifyEmailCallback,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = sanitizeRedirectPath(searchParams.get('next'), '/dashboard');
  const scanUrl = searchParams.get('scanUrl');

  if (!tokenHash && !code) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+verification+token', request.url)
    );
  }

  try {
    const { session, type: callbackType } = await verifyEmailCallback({
      code,
      tokenHash,
      type,
    });

    const responseUrl = callbackType === 'recovery'
      ? new URL('/login', request.url)
      : new URL(buildPostAuthRedirectPath(next, scanUrl), request.url);
    if (callbackType === 'recovery') {
      responseUrl.searchParams.set('mode', 'reset-password');
      responseUrl.searchParams.set('next', next);
      if (scanUrl) {
        responseUrl.searchParams.set('scanUrl', scanUrl);
      }
    }

    const response = NextResponse.redirect(responseUrl);
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    console.error('[auth.callback] verification failed', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
