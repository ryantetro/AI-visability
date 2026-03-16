import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/services/registry';
import { getDatabase } from '@/lib/services/registry';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { scanId, plan } = body;

  // If scanId is provided, verify ownership
  if (scanId) {
    const db = getDatabase();
    const scan = await db.getScan(scanId);
    if (!scan || !scan.email || scan.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'This scan belongs to another account.' }, { status: 403 });
    }
  }

  const payment = getPayment();
  const session = await payment.createCheckout(scanId || `upgrade_${user.id}`, plan);

  return NextResponse.json(session);
}
