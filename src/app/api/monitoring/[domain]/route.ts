import { NextRequest, NextResponse } from 'next/server';
import { removeMonitoringDomain } from '@/lib/monitoring';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { domain } = await params;

  try {
    const removed = await removeMonitoringDomain(decodeURIComponent(domain), user.email);
    if (!removed) {
      return NextResponse.json({ error: 'Monitoring record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove monitoring.' },
      { status: 400 }
    );
  }
}
