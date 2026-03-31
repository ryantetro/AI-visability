import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getOrCreateProfile, getUserUsage } from '@/lib/user-profile';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const profile = await getOrCreateProfile(user.id, user.email);
    const usage = getUserUsage(profile);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('[api/auth/usage] failed; returning null fallback', {
      userId: user.id,
      email: user.email,
      error,
    });
    return NextResponse.json(null);
  }
}
