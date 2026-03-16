import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getAlertService, getMentionTester, getPromptMonitoring } from '@/lib/services/registry';
import { analyzeResponse } from '@/lib/ai-mentions/mention-analyzer';
import type { MentionPrompt } from '@/types/ai-mentions';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.MONITORING_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  const alertService = getAlertService();

  try {
    // ── Phase 1: Existing score-check loop ───────────────────────
    const scans = await db.listCompletedScans(10);
    const results = [];

    for (const scan of scans) {
      try {
        const domain = new URL(scan.url).hostname;
        const scoreResult = scan.scoreResult as { percentage?: number } | undefined;
        const currentScore = scoreResult?.percentage ?? 0;

        results.push({
          domain,
          scanId: scan.id,
          score: currentScore,
          status: 'checked',
        });

        const ALERT_THRESHOLD = 50;
        if (currentScore < ALERT_THRESHOLD) {
          await alertService.sendScoreAlert({
            domain,
            previousScore: currentScore,
            currentScore,
            threshold: ALERT_THRESHOLD,
            recipientEmail: scan.email ?? 'unknown',
          });
        }
      } catch {
        results.push({
          domain: scan.url,
          scanId: scan.id,
          status: 'error',
        });
      }
    }

    // ── Phase 2: Prompt monitoring loop ──────────────────────────
    const pm = getPromptMonitoring();
    const tester = getMentionTester();
    const engines = tester.availableEngines();
    let promptsChecked = 0;
    let promptErrors = 0;

    try {
      const activeDomains = await pm.listActiveDomainsWithPrompts();

      for (const domain of activeDomains) {
        const prompts = await pm.listPrompts(domain);
        const active = prompts.filter((p) => p.active);

        for (const prompt of active) {
          const mentionPrompt: MentionPrompt = {
            id: prompt.id,
            text: prompt.promptText,
            category: (prompt.category === 'brand' || prompt.category === 'competitor' || prompt.category === 'industry')
              ? prompt.category as 'direct'
              : 'direct',
            industry: prompt.industry ?? '',
          };

          for (const engine of engines) {
            try {
              const response = await tester.query(engine, mentionPrompt);
              const analysis = analyzeResponse(response, domain, domain);

              await pm.savePromptResult({
                promptId: prompt.id,
                domain,
                engine,
                mentioned: analysis.mentioned,
                position: analysis.position,
                sentiment: analysis.sentiment,
                citationPresent: analysis.citationPresent,
                citationUrls: analysis.citationUrls,
                rawSnippet: analysis.rawSnippet,
                testedAt: new Date().toISOString(),
              });

              // Save competitor appearances
              const weekStart = getWeekStart();
              for (const comp of analysis.competitors) {
                try {
                  await pm.saveCompetitorAppearance({
                    domain,
                    competitor: comp,
                    competitorDomain: null,
                    engine,
                    promptId: prompt.id,
                    position: null,
                    coMentioned: analysis.mentioned,
                    weekStart,
                  });
                } catch {
                  // non-critical — don't break on competitor save failure
                }
              }

              promptsChecked++;
            } catch {
              promptErrors++;
            }
          }
        }
      }
    } catch {
      // Prompt monitoring failure shouldn't break the entire cron
      promptErrors++;
    }

    return NextResponse.json({
      checked: results.length,
      results,
      promptMonitoring: {
        promptsChecked,
        promptErrors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Monitoring check failed', detail: String(err) },
      { status: 500 }
    );
  }
}
