import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthUserFromRequest, sanitizeAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // No cookie at all — user is not logged in
  if (!token) {
    return NextResponse.json({ user: null, reason: 'no_session' });
  }

  // Cookie exists — validate it
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null, reason: 'token_invalid' }, { status: 401 });
  }

  return NextResponse.json({ user: sanitizeAuthUser(user) });
}
