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
  requiresStripeBillingForPlan,
  resolveBillingIdentityForUser,
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

    const needsExistingStripeSubscription = Boolean(
      context.billingProfile.stripe_subscription_id
      || requiresStripeBillingForPlan(context.access.plan, context.billingProfile.email),
    );

    if (context.access.plan !== 'free' && !needsExistingStripeSubscription) {
      return NextResponse.json(
        {
          error: 'This workspace uses a custom billing arrangement outside Stripe.',
          code: 'repair_required',
          billingConnectionState: 'unrecoverable',
          recoveryMessage: 'This workspace uses a custom billing arrangement outside Stripe.',
          recoveryAction: 'contact_support',
        },
        { status: 409 },
      );
    }

    const billingResolution = needsExistingStripeSubscription
      ? await resolveBillingIdentityForUser(context.billingOwner.userId, {
          email: context.billingProfile.email,
          plan: context.access.plan,
          stripe_customer_id: context.billingProfile.stripe_customer_id,
          stripe_subscription_id: context.billingProfile.stripe_subscription_id,
        })
      : null;
    const subscriptionId = billingResolution?.subscription?.subscriptionId ?? null;

    if (!subscriptionId) {
      if (context.access.plan !== 'free') {
        return NextResponse.json(
          {
            error: billingResolution?.message ?? 'Billing needs attention before Stripe can open this plan change.',
            code: 'repair_required',
            billingConnectionState: billingResolution?.state ?? 'unrecoverable',
            recoveryMessage: billingResolution?.message ?? null,
            recoveryAction: billingResolution?.recoveryAction ?? 'contact_support',
          },
          { status: 409 },
        );
      }

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
