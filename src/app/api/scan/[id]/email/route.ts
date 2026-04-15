import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail) {
    return NextResponse.json({ error: 'Authenticated user email is required.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const requestedEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (requestedEmail && requestedEmail !== userEmail) {
    return NextResponse.json({ error: 'This scan belongs to another account.' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  const scanEmail = scan.email?.trim().toLowerCase();
  if (scanEmail && scanEmail !== userEmail) {
    return NextResponse.json({ error: 'This scan belongs to another account.' }, { status: 403 });
  }

  if (!scanEmail) {
    scan.email = userEmail;
    await db.saveScan(scan);
  }

  return NextResponse.json({ success: true });
}
