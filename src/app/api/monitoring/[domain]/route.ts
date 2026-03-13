import { NextRequest, NextResponse } from 'next/server';
import { removeMonitoringDomain } from '@/lib/monitoring';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;
  const email = request.nextUrl.searchParams.get('email') ?? undefined;

  try {
    const removed = await removeMonitoringDomain(decodeURIComponent(domain), email);
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
