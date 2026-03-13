import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { startDomainVerification } from '@/lib/public-proof';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    scanId,
    enablePublicScore = true,
    enableBadge = true,
    enableLeaderboard = false,
  } = body ?? {};

  if (!scanId) {
    return NextResponse.json({ error: 'scanId is required.' }, { status: 400 });
  }

  const db = getDatabase();
  const scan = await db.getScan(scanId);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
  }

  const result = await startDomainVerification({
    scanId,
    url: scan.url,
    email: scan.email,
    enablePublicScore,
    enableBadge,
    enableLeaderboard,
  });

  return NextResponse.json(result);
}
