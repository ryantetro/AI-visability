import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { countCompetitors, getCompetitor, updateCompetitorScan } from '@/lib/competitor-service';
import { startScan, getClientIp } from '@/lib/scan-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const competitor = await getCompetitor(id, user.id);

  if (!competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  if (competitor.userId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const access = await getUserAccess(user.id, user.email);
    const competitorCount = await countCompetitors(user.id, competitor.domain);
    if (access.maxCompetitors >= 0 && competitorCount > access.maxCompetitors) {
      return NextResponse.json(
        {
          error: `This domain is over the ${access.tier} plan competitor limit. Remove competitors until it fits your plan before rescanning.`,
        },
        { status: 403 },
      );
    }

    const ip = getClientIp(request.headers);
    const scanResult = await startScan({
      url: competitor.competitorUrl,
      force: true,
      ip,
      userEmail: user.email,
      userId: user.id,
    }, {
      schedule(task) { after(task); },
    });

    if (scanResult.status === 200 && scanResult.body.id) {
      await updateCompetitorScan(id, scanResult.body.id as string, 'scanning');

      return NextResponse.json({
        scanId: scanResult.body.id,
        status: 'scanning',
      });
    }

    return NextResponse.json(
      { error: scanResult.body.error ?? 'Failed to start scan' },
      { status: scanResult.status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start rescan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
