import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import {
  buildPlanUsageSnapshot,
  resolveBillingContext,
  resolvePlanChangeDecision,
  isHybridChangePlanEnabled,
} from '@/lib/billing';
import { isPaymentPlanString } from '@/lib/pricing';
import {
  canUseStripe,
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
  if (!isPaymentPlanString(targetPlan)) {
    return NextResponse.json({ error: 'A valid target plan is required' }, { status: 400 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: `Only the ${context.billingOwner.teamName ?? 'billing'} owner can change plans.` },
        { status: 403 },
      );
    }
    if (context.access.plan === targetPlan) {
      return NextResponse.json({ error: 'This plan is already active.' }, { status: 400 });
    }

    if (requiresStripeBillingForPlan(context.access.plan, context.billingProfile.email) || context.billingProfile.stripe_subscription_id) {
      const resolution = await resolveBillingIdentityForUser(
        context.billingOwner.userId,
        {
          email: context.billingProfile.email,
          plan: context.access.plan,
          stripe_customer_id: context.billingProfile.stripe_customer_id,
          stripe_subscription_id: context.billingProfile.stripe_subscription_id,
        },
      );
      if (resolution.state !== 'healthy') {
        return NextResponse.json(
          {
            error: resolution.message ?? 'Billing needs attention before this plan change can be previewed.',
            code: 'repair_required',
            billingConnectionState: resolution.state,
            recoveryMessage: resolution.message,
            recoveryAction: resolution.recoveryAction,
          },
          { status: 409 },
        );
      }
    }

    const effectiveAt = context.access.planExpiresAt;
    const preview = await buildPlanUsageSnapshot(context, targetPlan, effectiveAt);
    const change = resolvePlanChangeDecision(context, targetPlan, {
      hybridEnabled: isHybridChangePlanEnabled(),
      stripeAvailable: canUseStripe(),
    });

    return NextResponse.json({
      ...preview,
      change,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview this plan change' },
      { status: 500 },
    );
  }
}
