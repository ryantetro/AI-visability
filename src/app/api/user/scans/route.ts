import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import type { ScoreResult } from '@/types/score';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scans')
    .select('id, url, status, paid, email, created_at, completed_at, score_result, mention_summary')
    .eq('email', user.email.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load scans' }, { status: 500 });
  }

  const scans = (data ?? []).map((scan) => {
    const scoreResult = scan.score_result as ScoreResult | null;
    const scoreSnapshot = scoreResult?.scores;
    const overallScore = scoreSnapshot?.overall ?? scoreResult?.percentage ?? null;
    return {
      id: scan.id,
      url: scan.url,
      status: scan.status,
      score: overallScore ?? undefined,
      scores: scoreResult ? {
        aiVisibility: scoreSnapshot?.aiVisibility ?? scoreResult.percentage ?? 0,
        webHealth: scoreSnapshot?.webHealth ?? null,
        overall: overallScore,
        potentialLift: scoreSnapshot?.potentialLift ?? null,
      } : undefined,
      previewFixes: scoreResult?.fixes?.slice(0, 3)?.map((f) => ({ checkId: f.checkId, label: f.label })),
      hasEmail: !!scan.email,
      hasPaid: !!scan.paid,
      createdAt: new Date(scan.created_at).getTime(),
      completedAt: scan.completed_at ? new Date(scan.completed_at).getTime() : undefined,
    };
  });

  return NextResponse.json({ scans });
}
