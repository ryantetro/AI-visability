import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getMonitoringDomain } from '@/lib/monitoring';
import { getOpportunityAlertSummary } from '@/lib/opportunity-alerts';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }

  try {
    const monitoringRecord = await getMonitoringDomain(domain, user.email);
    if (!monitoringRecord || monitoringRecord.status !== 'active' || !monitoringRecord.opportunityAlertsEnabled) {
      return NextResponse.json({ opportunity: null });
    }

    const opportunity = await getOpportunityAlertSummary({
      domain: monitoringRecord.domain,
      userEmail: user.email,
      fallbackScanId: monitoringRecord.scanId,
    });

    return NextResponse.json({ opportunity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load opportunity alert.' },
      { status: 500 }
    );
  }
}
