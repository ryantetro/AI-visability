import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getBillingStatus } from '@/lib/billing';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const status = await getBillingStatus(user.id, user.email);
    return NextResponse.json(status);
  } catch (error) {
    console.error('[api/billing/status] failed; returning null fallback', {
      userId: user.id,
      email: user.email,
      error,
    });
    return NextResponse.json(null);
  }
}
