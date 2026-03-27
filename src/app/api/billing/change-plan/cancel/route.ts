import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { resolveBillingContext } from '@/lib/billing';
import { getSupabaseClient } from '@/lib/supabase';
import { cancelSubscriptionPlanChange } from '@/lib/services/stripe-payment';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: `Only the ${context.billingOwner.teamName ?? 'billing'} owner can change plans.` },
        { status: 403 },
      );
    }

    const scheduleId = context.billingProfile.stripe_subscription_schedule_id;
    if (scheduleId) {
      await cancelSubscriptionPlanChange(scheduleId);
    }

    const supabase = getSupabaseClient();
    await supabase
      .from('user_profiles')
      .update({
        pending_plan: null,
        pending_plan_effective_at: null,
        stripe_subscription_schedule_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.billingOwner.userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel this scheduled change' },
      { status: 500 },
    );
  }
}
