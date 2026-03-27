import { NextRequest, NextResponse } from 'next/server';
import { getPayment, getDatabase } from '@/lib/services/registry';
import { getAuthUserFromRequest } from '@/lib/auth';
import { upgradeUserPlan } from '@/lib/user-profile';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const payment = getPayment();
  const result = await payment.verifyPayment(sessionId);

  if (result.userId && result.userId !== user.id) {
    return NextResponse.json({ error: 'This checkout belongs to another account.' }, { status: 403 });
  }

  if (result.paid) {
    const plan = result.plan || 'starter_monthly';

    if (result.scanId && !result.scanId.startsWith('upgrade_')) {
      const db = getDatabase();
      const scan = await db.getScan(result.scanId);
      if (scan && scan.email?.toLowerCase() === user.email.toLowerCase()) {
        scan.paid = true;
        await db.saveScan(scan);
      } else if (scan) {
        return NextResponse.json({ error: 'This checkout belongs to another account.' }, { status: 403 });
      }
    }

    // Keep the webhook as the source of truth, but also apply the upgrade here so the
    // returning user sees the new plan immediately and webhook delays do not block access.
    try {
      await upgradeUserPlan(user.id, plan);

      const updatePayload: Record<string, string | boolean | null> = {
        plan_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (result.customerId) {
        updatePayload.stripe_customer_id = result.customerId;
      }
      if (result.subscriptionId) {
        updatePayload.stripe_subscription_id = result.subscriptionId;
      }
      if (typeof result.cancelAtPeriodEnd === 'boolean') {
        updatePayload.plan_cancel_at_period_end = result.cancelAtPeriodEnd;
      }
      if (typeof result.currentPeriodEnd !== 'undefined') {
        updatePayload.plan_expires_at = result.currentPeriodEnd ?? null;
      }
      if (typeof result.scheduleId !== 'undefined') {
        updatePayload.stripe_subscription_schedule_id = result.scheduleId ?? null;
      }

      if (!result.scheduleId) {
        updatePayload.pending_plan = null;
        updatePayload.pending_plan_effective_at = null;
      }

      await getSupabaseClient()
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', user.id);
    } catch {
      // Non-blocking: scan unlock still succeeds even if plan upgrade fails
    }
  }

  return NextResponse.json(result);
}
