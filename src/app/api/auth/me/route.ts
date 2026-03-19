import { NextRequest, NextResponse } from 'next/server';
import { refreshRequestSession, sanitizeAuthUser } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/user-profile';
import { getUserAccess } from '@/lib/access';

export async function GET(request: NextRequest) {
  const response = new NextResponse(null);
  const auth = await refreshRequestSession(request, response);
  if (!auth.user) {
    return NextResponse.json(
      { user: null, plan: 'free', reason: auth.reason ?? 'no_session' },
      {
        status: auth.reason === 'no_session' ? 200 : 401,
        headers: response.headers,
      }
    );
  }

  // Fetch plan info and access details
  let plan = 'free';
  let scansUsed = 0;
  let freeScanLimit = 3;
  let tier = 'free' as string;
  let isPaid = false;
  let maxDomains = 1;
  let maxPrompts = 5;
  try {
    const profile = await getOrCreateProfile(auth.user.id, auth.user.email);
    const access = await getUserAccess(auth.user.id, auth.user.email);
    plan = access.plan;
    tier = access.tier;
    isPaid = access.isPaid;
    maxDomains = access.maxDomains;
    maxPrompts = access.maxPrompts;
    scansUsed = profile.scans_used;
    freeScanLimit = profile.free_scan_limit;
  } catch {
    // Non-blocking: return user info even if profile fetch fails
  }

  return NextResponse.json({
    user: sanitizeAuthUser(auth.user),
    plan,
    tier,
    isPaid,
    maxDomains,
    maxPrompts,
    scans_used: scansUsed,
    free_scan_limit: freeScanLimit,
    session: {
      expiresAt: auth.session?.expiresAt ?? null,
    },
  }, {
    headers: response.headers,
  });
}
