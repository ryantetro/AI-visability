import { NextRequest, NextResponse } from 'next/server';
import { confirmDomainVerification } from '@/lib/public-proof';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail) {
    return NextResponse.json({ error: 'Authenticated user email is required.' }, { status: 400 });
  }

  const body = await request.json();
  const {
    domain,
    enablePublicScore = true,
    enableBadge = true,
    enableLeaderboard = false,
  } = body ?? {};

  if (!domain) {
    return NextResponse.json({ error: 'domain is required.' }, { status: 400 });
  }

  const result = await confirmDomainVerification({
    domain,
    email: userEmail,
    enablePublicScore,
    enableBadge,
    enableLeaderboard,
  });

  if (!result.verified) {
    return NextResponse.json(result, { status: result.unauthorized ? 403 : 409 });
  }

  return NextResponse.json(result);
}
