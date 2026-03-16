import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, setAuthCookies } from '@/lib/auth';

/**
 * Handles Magic Link callback from Supabase Auth.
 * User clicks the link in their email and lands here with token_hash in the URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const next = searchParams.get('next') || '/analysis';

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+verification+token', request.url)
    );
  }

  try {
    const { accessToken, refreshToken } = await verifyMagicLink(tokenHash);
    const response = NextResponse.redirect(new URL(next, request.url));
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
