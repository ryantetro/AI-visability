import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/services/registry';
import { getDatabase } from '@/lib/services/registry';
import { getAuthUserFromRequest } from '@/lib/auth';
import { canUseStripe, createSubscriptionCheckout } from '@/lib/services/stripe-payment';
import { isPaymentPlanString } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { scanId?: string; plan?: string; returnPath?: string; cancelPath?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { scanId, plan, returnPath, cancelPath } = body;
  const selectedPlan = plan == null
    ? 'starter_monthly'
    : isPaymentPlanString(plan)
      ? plan
      : null;

  if (!selectedPlan) {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
  }

  // If scanId is provided and not a direct upgrade, verify ownership
  if (scanId && !scanId.startsWith('upgrade_')) {
    const db = getDatabase();
    const scan = await db.getScan(scanId);
    if (!scan || !scan.email || scan.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'This scan belongs to another account.' }, { status: 403 });
    }
  }

  // Use subscription-based checkout when Stripe is configured
  if (canUseStripe()) {
    try {
      const session = await createSubscriptionCheckout(user.id, user.email, selectedPlan, {
        returnPath,
        cancelPath,
      });
      return NextResponse.json(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Fallback to legacy payment service (mock mode)
  const payment = getPayment();
  const session = await payment.createCheckout(scanId || `upgrade_${user.id}`, selectedPlan);
  return NextResponse.json(session);
}
