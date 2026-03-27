import { NextRequest, NextResponse } from 'next/server';
import { addMonitoringDomain, listMonitoringDomains } from '@/lib/monitoring';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getCurrentBillingReadiness } from '@/lib/billing';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domains = await listMonitoringDomains(user.email);
  return NextResponse.json({ domains });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json();
  const { scanId, alertThreshold } = body ?? {};

  if (!scanId) {
    return NextResponse.json({ error: 'scanId is required.' }, { status: 400 });
  }

  try {
    const readiness = await getCurrentBillingReadiness(user.id, user.email);
    const hasDomainOverage = readiness.snapshot.issues.some((issue) => issue.category === 'domains');
    if (hasDomainOverage) {
      return NextResponse.json(
        { error: 'This workspace is over its active domain limit. Remove domains until it fits your plan before enabling monitoring.' },
        { status: 403 },
      );
    }

    const record = await addMonitoringDomain({ scanId, alertThreshold });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enable monitoring.' },
      { status: 400 }
    );
  }
}
