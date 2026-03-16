import { NextRequest, NextResponse } from 'next/server';
import { getPayment, getDatabase } from '@/lib/services/registry';
import { getAuthUserFromRequest } from '@/lib/auth';
import { upgradeUserPlan } from '@/lib/user-profile';

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

  if (result.paid) {
    const db = getDatabase();
    const scan = await db.getScan(result.scanId);
    if (scan && scan.email?.toLowerCase() === user.email.toLowerCase()) {
      scan.paid = true;
      await db.saveScan(scan);

      // Upgrade the user's plan
      const plan = result.plan || 'lifetime';
      try {
        await upgradeUserPlan(user.id, plan);
      } catch {
        // Non-blocking: scan unlock still succeeds even if plan upgrade fails
      }
    } else {
      return NextResponse.json({ error: 'This checkout belongs to another account.' }, { status: 403 });
    }
  }

  return NextResponse.json(result);
}
