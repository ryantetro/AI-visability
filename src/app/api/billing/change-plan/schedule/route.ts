import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import {
  buildPlanUsageSnapshot,
  isHybridChangePlanEnabled,
  resolveBillingContext,
  resolvePlanChangeDecision,
} from '@/lib/billing';
import { isPaymentPlanString, planStringToTier, TIER_LEVEL } from '@/lib/pricing';
import { getSupabaseClient } from '@/lib/supabase';
import { canUseStripe, scheduleSubscriptionPlanChange, syncStripeSubscriptionForUser } from '@/lib/services/stripe-payment';

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

  if (!canUseStripe()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: `Only the ${context.billingOwner.teamName ?? 'billing'} owner can change plans.` },
        { status: 403 },
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
      return NextResponse.json({ error: 'No active Stripe subscription was found for this workspace.' }, { status: 400 });
    }
    if (context.access.plan === targetPlan) {
      return NextResponse.json({ error: 'This plan is already active.' }, { status: 400 });
    }

    const hybridEnabled = isHybridChangePlanEnabled();
    const change = resolvePlanChangeDecision(context, targetPlan, {
      hybridEnabled,
      stripeAvailable: canUseStripe(),
    });
    const targetTier = planStringToTier(targetPlan);
    const isDowngrade = TIER_LEVEL[targetTier] < TIER_LEVEL[context.access.tier];

    if (hybridEnabled && change.canUseStripe) {
      return NextResponse.json(
        {
          error: 'This change now completes in Stripe instead of the guided scheduler.',
          decision: change.decision,
        },
        { status: 409 },
      );
    }

    if (hybridEnabled && !isDowngrade) {
      return NextResponse.json(
        {
          error: 'Only lower-plan changes can be scheduled in the guided flow.',
          decision: change.decision,
        },
        { status: 400 },
      );
    }

    const preview = await buildPlanUsageSnapshot(context, targetPlan, context.access.planExpiresAt);
    const scheduled = await scheduleSubscriptionPlanChange(
      subscriptionId,
      targetPlan,
      context.billingProfile.stripe_subscription_schedule_id,
    );

    const supabase = getSupabaseClient();
    await supabase
      .from('user_profiles')
      .update({
        pending_plan: targetPlan,
        pending_plan_effective_at: scheduled.effectiveAt,
        stripe_subscription_schedule_id: scheduled.scheduleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.billingOwner.userId);

    return NextResponse.json({
      ok: true,
      pendingChange: {
        targetPlan,
        effectiveAt: scheduled.effectiveAt,
        scheduleId: scheduled.scheduleId,
      },
      readiness: preview,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule this plan change' },
      { status: 500 },
    );
  }
}
