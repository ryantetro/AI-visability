import { NextRequest, NextResponse } from 'next/server';
import { refreshRequestSession, sanitizeAuthUser } from '@/lib/auth';
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
  let maxPlatforms = 2;
  let maxCompetitors = 0;
  let maxRegions = 1;
  let maxSeats = 1;
  let maxContentPages = 0;
  let teamId: string | null = null;
  let teamRole: string | null = null;
  let teamName: string | null = null;
  let planExpiresAt: string | null = null;
  let planCancelAtPeriodEnd = false;
  try {
    const access = await getUserAccess(auth.user.id, auth.user.email);
    plan = access.plan;
    tier = access.tier;
    isPaid = access.isPaid;
    scansUsed = access.scansUsed;
    freeScanLimit = access.freeScanLimit;
    maxDomains = access.maxDomains;
    maxPrompts = access.maxPrompts;
    maxPlatforms = access.maxPlatforms;
    maxCompetitors = access.maxCompetitors;
    maxRegions = access.maxRegions;
    maxSeats = access.maxSeats;
    maxContentPages = access.maxContentPages;
    teamId = access.teamId;
    teamRole = access.teamRole;
    teamName = access.teamName;
    planExpiresAt = access.planExpiresAt;
    planCancelAtPeriodEnd = access.planCancelAtPeriodEnd;
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
    maxPlatforms,
    maxCompetitors,
    maxRegions,
    maxSeats,
    maxContentPages,
    teamId,
    teamRole,
    teamName,
    planExpiresAt,
    planCancelAtPeriodEnd,
    scans_used: scansUsed,
    free_scan_limit: freeScanLimit,
    session: {
      expiresAt: auth.session?.expiresAt ?? null,
    },
  }, {
    headers: response.headers,
  });
}
