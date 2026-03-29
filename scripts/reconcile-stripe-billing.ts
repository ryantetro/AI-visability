import { getSupabaseClient } from '@/lib/supabase';
import { requiresStripeBillingForPlan, resolveBillingIdentityForUser } from '@/lib/services/stripe-payment';

interface BillingProfileRow {
  id: string;
  email: string | null;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_schedule_id: string | null;
}

interface BillingReportEntry {
  userId: string;
  email: string | null;
  plan: string;
  state: string;
  repaired: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  scheduleId: string | null;
  message: string | null;
}

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_schedule_id')
    .neq('plan', 'free')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load billing profiles: ${error.message}`);
  }

  const profiles = (data ?? []) as BillingProfileRow[];
  const report = {
    repaired: [] as BillingReportEntry[],
    already_healthy: [] as BillingReportEntry[],
    needs_manual_review: [] as BillingReportEntry[],
  };

  for (const profile of profiles) {
    const stripeManagedWorkspace = Boolean(
      profile.stripe_subscription_id
      || profile.stripe_customer_id
      || requiresStripeBillingForPlan(profile.plan),
    );

    if (!stripeManagedWorkspace) {
      report.already_healthy.push({
        userId: profile.id,
        email: profile.email,
        plan: profile.plan,
        state: 'healthy',
        repaired: false,
        customerId: profile.stripe_customer_id,
        subscriptionId: profile.stripe_subscription_id,
        scheduleId: profile.stripe_subscription_schedule_id,
        message: 'Non-Stripe-managed plan; skipped Stripe reconciliation.',
      });
      continue;
    }

    const resolution = await resolveBillingIdentityForUser(
      profile.id,
      {
        email: profile.email,
        plan: profile.plan,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id,
      },
      { attemptRepair: true },
    );

    const entry: BillingReportEntry = {
      userId: profile.id,
      email: profile.email,
      plan: profile.plan,
      state: resolution.state,
      repaired: resolution.repaired,
      customerId: resolution.subscription?.customerId ?? profile.stripe_customer_id,
      subscriptionId: resolution.subscription?.subscriptionId ?? profile.stripe_subscription_id,
      scheduleId: resolution.subscription?.scheduleId ?? profile.stripe_subscription_schedule_id,
      message: resolution.message,
    };

    if (resolution.state === 'healthy' && resolution.repaired) {
      report.repaired.push(entry);
      continue;
    }

    if (resolution.state === 'healthy' || resolution.state === 'free') {
      report.already_healthy.push(entry);
      continue;
    }

    report.needs_manual_review.push(entry);
  }

  console.log(JSON.stringify({
    summary: {
      scanned: profiles.length,
      repaired: report.repaired.length,
      already_healthy: report.already_healthy.length,
      needs_manual_review: report.needs_manual_review.length,
    },
    ...report,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
