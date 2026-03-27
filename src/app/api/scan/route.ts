import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getCurrentBillingReadiness } from '@/lib/billing';
import { getClientIp, startScan } from '@/lib/scan-workflow';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const readiness = await getCurrentBillingReadiness(user.id, user.email);
    const hasDomainOverage = readiness.snapshot.issues.some((issue) => issue.category === 'domains');
    if (hasDomainOverage) {
      return NextResponse.json(
        { error: 'This workspace is over its active domain limit. Remove domains until it fits your plan before starting new scans.' },
        { status: 403 },
      );
    }

    const result = await startScan(
      {
        url: body.url,
        force: body.force,
        ip: getClientIp(request.headers),
        userEmail: user.email,
        userId: user.id,
      },
      {
        schedule(task) {
          after(task);
        },
      }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 });
  }
}
