import { NextRequest, NextResponse } from 'next/server';
import { getPayment, getDatabase } from '@/lib/services/registry';

export async function POST(request: NextRequest) {
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
    if (scan) {
      scan.paid = true;
      await db.saveScan(scan);
    }
  }

  return NextResponse.json(result);
}
