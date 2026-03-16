/**
 * Capture a real scan of stripe.com and write it as the static example report.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/capture-example-scan.ts
 *
 * This crawls stripe.com, scores it, serializes the results, and writes
 * src/lib/analysis-example-report.ts with real data.
 */

import { crawlSite } from '../src/lib/crawler';
import { scoreCrawlData } from '../src/lib/scorer';
import { serializeScoreResult, buildSharePayload } from '../src/lib/report-serializer';
import { buildReportPromptBundle } from '../src/lib/llm-prompts';
import { getDomain, getFaviconUrl } from '../src/lib/url-utils';
import { runWebHealthEnrichment, createUnavailableWebHealth } from '../src/lib/web-health';
import type { CrawlData } from '../src/types/crawler';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TARGET_URL = 'https://stripe.com';

interface PreviewHomepageData {
  assetUrls?: string[];
  ogTags?: Record<string, string>;
  twitterTags?: Record<string, string>;
}

function buildAssetPreview(url: string, crawlData: CrawlData) {
  const homepage = crawlData.homepage as PreviewHomepageData | undefined;
  const domain = getDomain(url);
  const fallbackFavicon = domain ? getFaviconUrl(domain, 96) : null;

  return {
    faviconUrl:
      homepage?.assetUrls?.find((u: string) => /favicon|apple-touch-icon|icon/i.test(u)) ??
      fallbackFavicon,
    ogTitle: homepage?.ogTags?.['og:title'] || null,
    ogDescription: homepage?.ogTags?.['og:description'] || null,
    ogImageUrl: homepage?.ogTags?.['og:image'] || null,
    ogUrl: homepage?.ogTags?.['og:url'] || null,
    twitterCard: homepage?.twitterTags?.['twitter:card'] || null,
    twitterTitle: homepage?.twitterTags?.['twitter:title'] || null,
    twitterDescription: homepage?.twitterTags?.['twitter:description'] || null,
    twitterImageUrl:
      homepage?.twitterTags?.['twitter:image'] ||
      homepage?.twitterTags?.['twitter:image:src'] ||
      null,
  };
}

async function main() {
  console.log(`Crawling ${TARGET_URL}...`);
  const crawlData = await crawlSite(TARGET_URL, (step) => {
    console.log(`  [crawl] ${step}`);
  });
  console.log('Crawl complete.\n');

  // Run web health enrichment (with timeout)
  console.log('Running web health enrichment...');
  let webHealthResult;
  try {
    webHealthResult = await Promise.race([
      runWebHealthEnrichment(crawlData),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Web health timed out')), 20000)
      ),
    ]);
  } catch (err) {
    console.log(`  Web health failed: ${err}`);
    webHealthResult = createUnavailableWebHealth(String(err));
  }
  console.log('Web health done.\n');

  // Score
  console.log('Scoring...');
  const webHealth = webHealthResult?.status === 'complete' ? webHealthResult : undefined;
  const scoreResult = scoreCrawlData(crawlData, webHealth);
  console.log(`  AI Visibility: ${scoreResult.scores.aiVisibility}`);
  console.log(`  Web Health: ${scoreResult.scores.webHealth}`);
  console.log(`  Overall: ${scoreResult.scores.overall}`);
  console.log(`  Band: ${scoreResult.band}\n`);

  // Build all the shapes
  const serializedScore = serializeScoreResult(scoreResult);
  const copyToLlm = buildReportPromptBundle(TARGET_URL, scoreResult);
  const assetPreview = buildAssetPreview(TARGET_URL, crawlData);
  const now = Date.now();

  // Build the report object
  const report = {
    id: 'example-report',
    url: TARGET_URL,
    hasPaid: false,
    share: {
      publicUrl: '/analysis?example=1',
      badgeSvgUrl: '/api/badge/example-report',
      opengraphImageUrl: assetPreview.ogImageUrl || `https://stripe.com/img/v3/home/twitter.png`,
    },
    scores: serializedScore.scores,
    enrichments: {
      webHealth: {
        status: webHealthResult?.status === 'complete' ? 'complete' as const : 'unavailable' as const,
        startedAt: now - 30000,
        completedAt: now,
      },
    },
    copyToLlm,
    fixes: serializedScore.fixes,
    webHealth: serializedScore.webHealth,
    score: {
      total: serializedScore.total,
      maxTotal: serializedScore.maxTotal,
      percentage: serializedScore.percentage,
      band: serializedScore.band,
      bandInfo: serializedScore.bandInfo,
      overallBandInfo: serializedScore.overallBandInfo,
      scores: serializedScore.scores,
      dimensions: serializedScore.dimensions,
      fixes: serializedScore.fixes,
      webHealth: serializedScore.webHealth,
    },
  };

  // Build the scan object (what GET /api/scan/:id returns)
  const scan = {
    id: report.id,
    url: report.url,
    status: 'complete' as const,
    scores: report.scores,
    webHealth: report.webHealth,
    dimensions: serializedScore.dimensions,
    enrichments: report.enrichments,
    progress: {
      status: 'complete',
      checks: [
        { label: 'Crawl website', status: 'done' },
        { label: 'Score AI visibility', status: 'done' },
        { label: 'Measure web health', status: 'done' },
      ],
      currentStep: 'Complete',
    },
    score: serializedScore.percentage,
    previewFixes: serializedScore.fixes.slice(0, 3).map((fix) => ({
      checkId: fix.checkId,
      label: fix.label,
      detail: fix.detail,
      category: fix.category,
      estimatedLift: fix.estimatedLift,
    })),
    band: serializedScore.band,
    bandInfo: {
      ...serializedScore.bandInfo,
    },
    assetPreview,
    hasEmail: false,
    hasPaid: false,
    createdAt: now - 30000,
    completedAt: now,
    estimatedRemainingSec: 0,
  };

  // Write the JSON files for reference
  const outDir = path.join(__dirname, '..', 'scripts');
  fs.writeFileSync(
    path.join(outDir, 'example-report.json'),
    JSON.stringify(report, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, 'example-scan.json'),
    JSON.stringify(scan, null, 2)
  );

  console.log('Wrote scripts/example-report.json');
  console.log('Wrote scripts/example-scan.json');

  // Now generate the TypeScript source file
  const tsContent = `// Auto-generated from a real scan of ${TARGET_URL}
// Generated at: ${new Date().toISOString()}
// To regenerate: npx tsx scripts/capture-example-scan.ts

export const analysisExampleReport = ${JSON.stringify(report, null, 2)};

export const analysisExampleScan = ${JSON.stringify(scan, null, 2)};
`;

  const targetFile = path.join(__dirname, '..', 'src', 'lib', 'analysis-example-report.ts');
  fs.writeFileSync(targetFile, tsContent);
  console.log('\nWrote src/lib/analysis-example-report.ts with real data!');
  console.log('Done.');

  // Force exit (browser cleanup may hang)
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
