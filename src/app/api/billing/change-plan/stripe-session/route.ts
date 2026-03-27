import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import {
  isHybridChangePlanEnabled,
  isStripeHostedChangeDecision,
  resolveBillingContext,
  resolvePlanChangeDecision,
} from '@/lib/billing';
import { isPaymentPlanString } from '@/lib/pricing';
import {
  canUseStripe,
  createChangePlanPortalSession,
  createSubscriptionCheckout,
  syncStripeSubscriptionForUser,
} from '@/lib/services/stripe-payment';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const targetPlan = typeof body.targetPlan === 'string' ? body.targetPlan : '';
  const returnPath = typeof body.returnPath === 'string' ? body.returnPath : undefined;

  if (!isPaymentPlanString(targetPlan)) {
    return NextResponse.json({ error: 'A valid target plan is required.' }, { status: 400 });
  }

  if (!canUseStripe()) {
    return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    const change = resolvePlanChangeDecision(context, targetPlan, {
      hybridEnabled: isHybridChangePlanEnabled(),
      stripeAvailable: canUseStripe(),
    });

    console.info('[billing/change-plan/stripe-session]', {
      viewerUserId: user.id,
      billingOwnerUserId: context.billingOwner.userId,
      currentPlan: context.access.plan,
      targetPlan,
      decision: change.decision,
      canUseStripe: change.canUseStripe,
    });

    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: change.reason, decision: change.decision },
        { status: 403 },
      );
    }

    if (context.access.plan === targetPlan) {
      return NextResponse.json({ error: 'This plan is already active.' }, { status: 400 });
    }

    if (!isStripeHostedChangeDecision(change.decision) || !change.canUseStripe) {
      return NextResponse.json(
        {
          error: change.reason,
          decision: change.decision,
        },
        { status: 409 },
      );
    }

    let subscriptionId = context.billingProfile.stripe_subscription_id;
    if (!subscriptionId && context.billingProfile.stripe_customer_id) {
      const synced = await syncStripeSubscriptionForUser(
        context.billingOwner.userId,
        context.billingProfile.stripe_customer_id,
      );
      subscriptionId = synced?.subscriptionId ?? null;
    }

    if (!subscriptionId) {
      const checkoutSession = await createSubscriptionCheckout(
        context.billingOwner.userId,
        context.billingOwner.email ?? user.email,
        targetPlan,
        {
          returnPath,
          cancelPath: returnPath,
        },
      );

      return NextResponse.json({
        url: checkoutSession.url,
        decision: change.decision,
        targetPlan,
      });
    }

    const url = await createChangePlanPortalSession(
      context.billingOwner.userId,
      context.billingOwner.email ?? user.email,
      subscriptionId,
      targetPlan,
      returnPath,
    );

    return NextResponse.json({
      url,
      decision: change.decision,
      targetPlan,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create a hosted Stripe change-plan session.' },
      { status: 500 },
    );
  }
}
