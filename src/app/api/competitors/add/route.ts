import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { addCompetitor, countCompetitors, updateCompetitorScan } from '@/lib/competitor-service';
import { startScan, getClientIp } from '@/lib/scan-workflow';
import { getDomain, isValidUrl, ensureProtocol } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { competitorUrl?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { competitorUrl: rawUrl, domain } = body;
  if (!rawUrl || !domain) {
    return NextResponse.json({ error: 'competitorUrl and domain are required' }, { status: 400 });
  }

  const competitorUrl = ensureProtocol(rawUrl.trim());
  if (!isValidUrl(competitorUrl)) {
    return NextResponse.json({ error: 'Invalid competitor URL' }, { status: 400 });
  }

  const competitorDomain = getDomain(competitorUrl).replace(/^www\./, '');
  const userDomain = domain.replace(/^www\./, '');

  if (competitorDomain === userDomain) {
    return NextResponse.json({ error: "You can't add your own domain as a competitor" }, { status: 400 });
  }

  try {
    const count = await countCompetitors(user.id, domain);
    if (count >= 3) {
      return NextResponse.json({ error: 'Maximum of 3 competitors per domain' }, { status: 400 });
    }

    const competitor = await addCompetitor(user.id, domain, competitorUrl, competitorDomain);

    // Start a scan for the competitor
    const ip = getClientIp(request.headers);
    const scanResult = await startScan({
      url: competitorUrl,
      force: true,
      ip,
      userEmail: user.email,
      userId: user.id,
    }, {
      schedule(task) { after(task); },
    });

    if (scanResult.status === 200 && scanResult.body.id) {
      await updateCompetitorScan(
        competitor.id,
        scanResult.body.id as string,
        'scanning'
      );

      return NextResponse.json({
        id: competitor.id,
        scanId: scanResult.body.id,
        competitorDomain,
      });
    }

    // Scan failed to start but competitor was still added
    return NextResponse.json({
      id: competitor.id,
      scanId: null,
      competitorDomain,
      scanError: scanResult.body.error ?? 'Failed to start scan',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add competitor';
    const isDuplicate = message.includes('already being tracked');
    return NextResponse.json(
      { error: message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
