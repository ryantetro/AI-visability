import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { resolveBillingContext } from '@/lib/billing';
import {
  canUseStripe,
  createPortalSession,
  requiresStripeBillingForPlan,
  resolveBillingIdentityForUser,
} from '@/lib/services/stripe-payment';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let returnPath: string | undefined;
  try {
    const body = await request.json();
    returnPath = typeof body?.returnPath === 'string' ? body.returnPath : undefined;
  } catch {
    returnPath = undefined;
  }

  if (!canUseStripe()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  try {
    const context = await resolveBillingContext(user.id, user.email);
    if (!context.canManageBilling) {
      return NextResponse.json(
        { error: `Only the ${context.billingOwner.teamName ?? 'billing'} owner can manage billing.` },
        { status: 403 },
      );
    }

    const requiresManagedStripeSubscription = Boolean(
      requiresStripeBillingForPlan(context.access.plan, context.billingProfile.email)
      || context.billingProfile.stripe_subscription_id,
    );

    if (context.access.plan !== 'free' && !requiresManagedStripeSubscription) {
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

    if (requiresManagedStripeSubscription) {
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
            error: resolution.message ?? 'Billing needs attention before Stripe can open.',
            code: 'repair_required',
            billingConnectionState: resolution.state,
            recoveryMessage: resolution.message,
            recoveryAction: resolution.recoveryAction,
          },
          { status: 409 },
        );
      }
    }

    const portalUrl = await createPortalSession(
      context.billingOwner.userId,
      context.billingOwner.email ?? user.email,
      { returnPath },
    );
    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
