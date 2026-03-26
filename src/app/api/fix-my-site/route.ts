import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { createOrder, getOrdersByUser, VALID_FILES_REQUESTED } from '@/lib/fix-my-site';
import { createFixMySiteCheckout, canUseStripe } from '@/lib/services/stripe-payment';
import { getOrCreateProfile } from '@/lib/user-profile';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const orders = await getOrdersByUser(user.id);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('Failed to load Fix My Site orders:', err);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!canUseStripe()) {
    return NextResponse.json({ error: 'Payments are not configured' }, { status: 503 });
  }

  let body: { domain?: string; notes?: string; filesRequested?: string[]; returnPath?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { domain, notes, filesRequested, returnPath } = body;

  if (!domain || typeof domain !== 'string' || !domain.trim()) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  // Validate filesRequested if provided
  if (filesRequested) {
    if (!Array.isArray(filesRequested)) {
      return NextResponse.json({ error: 'filesRequested must be an array' }, { status: 400 });
    }
    const validSet = new Set<string>(VALID_FILES_REQUESTED);
    for (const f of filesRequested) {
      if (typeof f !== 'string' || !validSet.has(f)) {
        return NextResponse.json({ error: `Invalid file type: ${f}` }, { status: 400 });
      }
    }
  }

  try {
    // Ensure profile exists so Stripe customer can be created
    const profile = await getOrCreateProfile(user.id, user.email);

    const order = await createOrder(
      user.id,
      domain.trim(),
      notes,
      filesRequested,
    );

    const checkout = await createFixMySiteCheckout(user.id, profile.email, order.id, { returnPath });

    return NextResponse.json({
      order,
      checkoutUrl: checkout.url,
    });
  } catch (err) {
    console.error('Failed to create Fix My Site order:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
