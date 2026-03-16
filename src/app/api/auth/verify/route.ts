import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp, sanitizeAuthUser, setAuthCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, accessToken, refreshToken } = await verifyOtp(body.email || '', body.code || '');
    const response = NextResponse.json({ user: sanitizeAuthUser(user) });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify sign-in code.' },
      { status: 400 }
    );
  }
}
