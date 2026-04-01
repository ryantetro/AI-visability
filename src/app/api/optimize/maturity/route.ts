import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { computeMaturity } from '@/lib/optimize/maturity';
import { ensureOwnedDomain } from '@/lib/optimize/shared';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const domain = await ensureOwnedDomain(user.id, request.nextUrl.searchParams.get('domain'));
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  try {
    const maturity = await computeMaturity(user.id, domain);
    return NextResponse.json(maturity);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute maturity' },
      { status: 500 },
    );
  }
}
