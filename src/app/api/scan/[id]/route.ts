import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { estimateRemainingSeconds } from '@/lib/scan-eta';
import { ScoreResult } from '@/types/score';
import { serializeScoreResult } from '@/lib/report-serializer';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  const scoreResult = scan.scoreResult as ScoreResult | undefined;
  const estimatedRemainingSec = estimateRemainingSeconds(scan);

  const serializedScore = scoreResult ? serializeScoreResult(scoreResult) : null;

  return NextResponse.json({
    id: scan.id,
    url: scan.url,
    status: scan.status,
    progress: scan.progress,
    enrichments: scan.enrichments,
    score: scan.status === 'complete' ? scoreResult?.percentage : undefined,
    scores: serializedScore?.scores,
    webHealth: scan.status === 'complete' ? serializedScore?.webHealth ?? null : null,
    dimensions: scan.status === 'complete' ? serializedScore?.dimensions ?? [] : [],
    previewFixes: scan.status === 'complete' ? scoreResult?.fixes?.slice(0, 3) ?? [] : [],
    band: scan.status === 'complete' ? scoreResult?.band : undefined,
    bandInfo: scan.status === 'complete' ? scoreResult?.bandInfo : undefined,
    hasEmail: !!scan.email,
    hasPaid: !!scan.paid,
    createdAt: scan.createdAt,
    completedAt: scan.completedAt,
    estimatedRemainingSec,
  });
}
