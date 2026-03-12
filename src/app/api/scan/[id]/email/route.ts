import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { email } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  scan.email = email;
  await db.saveScan(scan);

  return NextResponse.json({ success: true });
}
