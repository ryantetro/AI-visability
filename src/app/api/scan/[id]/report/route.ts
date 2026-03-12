import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { buildReportPromptBundle } from '@/lib/llm-prompts';
import { ScoreResult } from '@/types/score';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (!scan.email) {
    return NextResponse.json({ error: 'Email required to view report' }, { status: 403 });
  }

  if (scan.status !== 'complete') {
    return NextResponse.json({ error: 'Scan not complete' }, { status: 400 });
  }

  const scoreResult = scan.scoreResult as ScoreResult;
  const copyToLlm = buildReportPromptBundle(scan.url, scoreResult);

  return NextResponse.json({
    id: scan.id,
    url: scan.url,
    score: scoreResult,
    webHealth: scoreResult.webHealth || null,
    fixes: scoreResult.fixes,
    copyToLlm,
    enrichments: scan.enrichments,
    hasPaid: !!scan.paid,
  });
}
