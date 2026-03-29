import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { resolveBillingContext } from '@/lib/billing';
import { resolveBillingIdentityForUser } from '@/lib/services/stripe-payment';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: `Only the ${context.billingOwner.teamName ?? 'billing'} owner can reconnect billing.` },
        { status: 403 },
      );
    }

    const resolution = await resolveBillingIdentityForUser(
      context.billingOwner.userId,
      {
        email: context.billingProfile.email,
        plan: context.access.plan,
        stripe_customer_id: context.billingProfile.stripe_customer_id,
        stripe_subscription_id: context.billingProfile.stripe_subscription_id,
      },
      { attemptRepair: true },
    );

    return NextResponse.json({
      ok: resolution.state === 'healthy',
      billingConnectionState: resolution.state,
      repaired: resolution.repaired,
      recoveryMessage: resolution.message,
      recoveryAction: resolution.recoveryAction,
      subscriptionId: resolution.subscription?.subscriptionId ?? null,
      customerId: resolution.subscription?.customerId ?? context.billingProfile.stripe_customer_id ?? null,
      scheduleId: resolution.subscription?.scheduleId ?? context.billingProfile.stripe_subscription_schedule_id ?? null,
      plan: resolution.subscription?.plan ?? context.access.plan,
      currentPeriodEnd: resolution.subscription?.currentPeriodEnd ?? context.access.planExpiresAt,
      cancelAtPeriodEnd: resolution.subscription?.cancelAtPeriodEnd ?? context.access.planCancelAtPeriodEnd,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reconcile billing' },
      { status: 500 },
    );
  }
}
