import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import type { ScoreSnapshot } from '@/types/score';

interface ScanSummaryRow {
  id: string;
  url: string;
  status: string;
  paid: boolean | null;
  email: string | null;
  created_at: string;
  completed_at: string | null;
  percentage: number | null;
  scores: ScoreSnapshot | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    // Only fetch the score summary fields the workspace list needs; full scan JSON can exceed serverless limits.
    const { data, error } = await supabase
      .from('scans')
      .select(
        'id, url, status, paid, email, created_at, completed_at, percentage:score_result->percentage, scores:score_result->scores'
      )
      .eq('email', user.email.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/user/scans] failed to load scans', {
        email: user.email,
        error,
      });
      return NextResponse.json({ error: 'Failed to load scans' }, { status: 500 });
    }

    const scans = ((data ?? []) as ScanSummaryRow[]).map((scan) => {
      const scoreSnapshot = scan.scores;
      const overallScore = scoreSnapshot?.overall ?? scan.percentage ?? null;

      return {
        id: scan.id,
        url: scan.url,
        status: scan.status,
        score: overallScore ?? undefined,
        scores: scoreSnapshot ? {
          aiVisibility: scoreSnapshot.aiVisibility ?? scan.percentage ?? 0,
          webHealth: scoreSnapshot.webHealth ?? null,
          overall: overallScore,
          potentialLift: scoreSnapshot.potentialLift ?? null,
        } : undefined,
        hasEmail: !!scan.email,
        hasPaid: !!scan.paid,
        createdAt: new Date(scan.created_at).getTime(),
        completedAt: scan.completed_at ? new Date(scan.completed_at).getTime() : undefined,
      };
    });

    return NextResponse.json({ scans });
  } catch (error) {
    console.error('[api/user/scans] unexpected error', error);
    return NextResponse.json({ error: 'Failed to load scans' }, { status: 500 });
  }
}
