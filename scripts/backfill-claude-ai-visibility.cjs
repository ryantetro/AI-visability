#!/usr/bin/env node
require('./register-ts.cjs');

const { getDatabase, getMentionTester, getPromptMonitoring } = require('../src/lib/services/registry.ts');
const { runMentionTests } = require('../src/lib/ai-mentions/index.ts');
const { normalizeMentionSummary } = require('../src/lib/ai-mentions/summary.ts');
const { analyzeResponse } = require('../src/lib/ai-mentions/mention-analyzer.ts');

const VALID_CATEGORIES = new Set([
  'direct',
  'category',
  'comparison',
  'recommendation',
  'workflow',
  'use-case',
  'problem-solution',
  'buyer-intent',
]);

function parseDays() {
  const value = Number(process.argv[2] || process.env.CLAUDE_BACKFILL_DAYS || '30');
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
}

function shouldBackfill(summary) {
  const normalized = normalizeMentionSummary(summary);
  if (!normalized) return true;
  const claudeStatus = normalized.engineStatus?.claude;
  if (!claudeStatus) return true;
  return claudeStatus.status !== 'complete';
}

function getWeekStartIso() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

async function backfillScans({ db, tester, days }) {
  const cutoff = Date.now() - days * 86400000;
  const scans = await db.listCompletedScans(200);
  const recentScans = scans.filter((scan) => (scan.completedAt ?? scan.createdAt) >= cutoff);

  let updated = 0;
  let skipped = 0;

  for (const scan of recentScans) {
    if (!scan.crawlData || !shouldBackfill(scan.mentionSummary)) {
      skipped += 1;
      continue;
    }

    try {
      const mentionSummary = await runMentionTests(scan.crawlData, tester);
      await db.saveScan({
        ...scan,
        mentionSummary,
      });
      updated += 1;
      console.log(`updated scan ${scan.id} (${scan.url})`);
    } catch (error) {
      skipped += 1;
      console.error(`failed scan ${scan.id}:`, error instanceof Error ? error.message : String(error));
    }
  }

  return { scanned: recentScans.length, updated, skipped };
}

async function seedPromptBaseline({ pm, tester }) {
  const domains = await pm.listActiveDomainsWithPrompts();
  const weekStart = getWeekStartIso();
  let promptsSeeded = 0;

  for (const domain of domains) {
    const prompts = await pm.listPrompts(domain);
    for (const prompt of prompts.filter((item) => item.active)) {
      const mentionPrompt = {
        id: prompt.id,
        text: prompt.promptText,
        category: VALID_CATEGORIES.has(prompt.category) ? prompt.category : 'direct',
        industry: prompt.industry ?? '',
      };

      try {
        const response = await tester.query('claude', mentionPrompt);
        const analysis = analyzeResponse(response, domain, domain);
        const testedAt = new Date().toISOString();

        await pm.savePromptResult({
          promptId: prompt.id,
          domain,
          engine: 'claude',
          mentioned: analysis.mentioned,
          position: analysis.position,
          sentiment: analysis.sentiment,
          citationPresent: analysis.citationPresent,
          citationUrls: analysis.citationUrls,
          rawSnippet: analysis.rawSnippet,
          testedAt,
        });

        for (const competitor of analysis.competitors) {
          await pm.saveCompetitorAppearance({
            domain,
            competitor,
            competitorDomain: null,
            engine: 'claude',
            promptId: prompt.id,
            position: null,
            coMentioned: analysis.mentioned,
            weekStart,
          });
        }

        promptsSeeded += 1;
      } catch (error) {
        console.error(`failed Claude prompt seed for ${domain}/${prompt.id}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  return { domains: domains.length, promptsSeeded };
}

async function main() {
  const tester = getMentionTester();
  if (!tester.availableEngines().includes('claude')) {
    throw new Error('Claude is not configured. Set ANTHROPIC_API_KEY before running this backfill.');
  }

  const days = parseDays();
  const db = getDatabase();
  const pm = getPromptMonitoring();

  console.log(`Backfilling Claude AI visibility for the last ${days} day(s)...`);

  const scanStats = await backfillScans({ db, tester, days });
  const promptStats = await seedPromptBaseline({ pm, tester });

  console.log('');
  console.log('Summary');
  console.log('-------');
  console.log(`recent scans considered: ${scanStats.scanned}`);
  console.log(`scans updated: ${scanStats.updated}`);
  console.log(`scans skipped/failed: ${scanStats.skipped}`);
  console.log(`active domains seeded: ${promptStats.domains}`);
  console.log(`Claude prompt baselines written: ${promptStats.promptsSeeded}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
