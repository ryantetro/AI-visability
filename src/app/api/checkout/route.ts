import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/services/registry';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scanId } = body;

  if (!scanId) {
    return NextResponse.json({ error: 'scanId required' }, { status: 400 });
  }

  const payment = getPayment();
  const session = await payment.createCheckout(scanId);

  return NextResponse.json(session);
}
