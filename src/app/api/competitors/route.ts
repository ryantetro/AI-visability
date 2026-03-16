import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPromptMonitoring } from '@/lib/services/registry';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const pm = getPromptMonitoring();

  try {
    const summaries = await pm.listCompetitorSummaries(domain, days);
    return NextResponse.json({ competitors: summaries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch competitors.' },
      { status: 500 }
    );
  }
}
