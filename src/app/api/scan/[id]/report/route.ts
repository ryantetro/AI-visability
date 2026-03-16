import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { buildReportPromptBundle } from '@/lib/llm-prompts';
import { buildSharePayload, serializeScoreResult } from '@/lib/report-serializer';
import { ScoreResult } from '@/types/score';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (!scan.email || scan.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This report belongs to another account.' }, { status: 403 });
  }

  if (scan.status !== 'complete') {
    return NextResponse.json({ error: 'Scan not complete' }, { status: 400 });
  }

  const scoreResult = scan.scoreResult as ScoreResult;
  const copyToLlm = buildReportPromptBundle(scan.url, scoreResult);
  const score = serializeScoreResult(scoreResult);

  return NextResponse.json({
    id: scan.id,
    url: scan.url,
    score,
    webHealth: score.webHealth,
    fixes: score.fixes,
    scores: score.scores,
    copyToLlm,
    share: buildSharePayload(scan.id),
    enrichments: scan.enrichments,
    mentionSummary: scan.mentionSummary ?? null,
    hasPaid: !!scan.paid,
  });
}
