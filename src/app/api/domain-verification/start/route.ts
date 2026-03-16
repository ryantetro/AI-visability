import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getDatabase } from '@/lib/services/registry';
import { startDomainVerification } from '@/lib/public-proof';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

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

  if (!scan.email || scan.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This scan belongs to another account.' }, { status: 403 });
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
