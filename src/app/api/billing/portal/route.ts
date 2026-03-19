import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { canUseStripe, createPortalSession } from '@/lib/services/stripe-payment';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!canUseStripe()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  try {
    const portalUrl = await createPortalSession(user.id, user.email);
    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
