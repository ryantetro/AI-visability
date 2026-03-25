import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringDomain, removeMonitoringDomain, updateMonitoringDomain } from '@/lib/monitoring';
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { domain } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.opportunityAlertsEnabled !== 'boolean') {
    return NextResponse.json({ error: 'opportunityAlertsEnabled must be a boolean.' }, { status: 400 });
  }

  try {
    const decodedDomain = decodeURIComponent(domain);
    const existing = await getMonitoringDomain(decodedDomain, user.email);
    if (!existing) {
      return NextResponse.json({ error: 'Monitoring record not found.' }, { status: 404 });
    }

    const updated = await updateMonitoringDomain(decodedDomain, user.email, {
      opportunityAlertsEnabled: body.opportunityAlertsEnabled,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Monitoring record not found.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update monitoring.' },
      { status: 400 }
    );
  }
}
