import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { resolveBillingContext } from '@/lib/billing';
import { getSupabaseClient } from '@/lib/supabase';
import { reactivateSubscription, syncStripeSubscriptionForUser } from '@/lib/services/stripe-payment';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: `Only the ${context.billingOwner.teamName ?? 'billing'} owner can reactivate the plan.` },
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
    if (!context.billingProfile.plan_cancel_at_period_end) {
      return NextResponse.json({ error: 'This subscription is already set to renew automatically.' }, { status: 400 });
    }

    const result = await reactivateSubscription(
      subscriptionId,
      context.billingProfile.stripe_subscription_schedule_id,
    );
    if (result.cancelAtPeriodEnd) {
      throw new Error('Stripe still has this subscription set to cancel. Please try again in a moment.');
    }
    const supabase = getSupabaseClient();
    const updatePayload: Record<string, string | boolean | null> = {
      plan_cancel_at_period_end: result.cancelAtPeriodEnd,
      plan_expires_at: result.currentPeriodEnd,
      stripe_subscription_schedule_id: result.scheduleId,
      plan_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!result.scheduleId) {
      updatePayload.pending_plan = null;
      updatePayload.pending_plan_effective_at = null;
    }

    await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', context.billingOwner.userId);

    return NextResponse.json({
      ok: true,
      currentPeriodEnd: result.currentPeriodEnd,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reactivate this subscription' },
      { status: 500 },
    );
  }
}
