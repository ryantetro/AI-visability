require('../scripts/register-ts.cjs');

const { crawlSite } = require('../src/lib/crawler/index.ts');
const { closeBrowser } = require('../src/lib/crawler/browser.ts');
const { scoreCrawlData } = require('../src/lib/scorer/index.ts');
const SITE_TIMEOUT_MS = 45_000;

const sites = process.argv.slice(2);
const targets = sites.length > 0
  ? sites
  : [
      'https://example.com',
      'https://openai.com',
      'https://developer.mozilla.org',
      'https://www.wikipedia.org',
      'https://stripe.com',
    ];

async function main() {
  const results = [];

  for (const url of targets) {
    console.error(`Scanning ${url}...`);
    const crawl = await withTimeout(crawlSite(url), SITE_TIMEOUT_MS, url);
    const score = scoreCrawlData(crawl);

    results.push({
      url,
      pages: crawl.pages.length,
      errors: crawl.errors,
      robots: {
        exists: crawl.robotsTxt.exists,
        gptbot: crawl.robotsTxt.allowsGPTBot,
        perplexity: crawl.robotsTxt.allowsPerplexityBot,
        claude: crawl.robotsTxt.allowsClaudeBot,
        sitemapRefs: crawl.robotsTxt.sitemapReferences.length,
      },
      sitemap: {
        exists: crawl.sitemap.exists,
        urlCount: crawl.sitemap.urlCount,
        referencedInRobots: crawl.sitemap.referencedInRobots,
      },
      llms: {
        exists: crawl.llmsTxt.exists,
        links: crawl.llmsTxt.links.length,
      },
      renderMode: crawl.renderReadiness.mode,
      score: {
        aiVisibility: score.scores.aiVisibility,
        overall: score.scores.overall,
        band: score.bandInfo.label,
      },
      homepage: crawl.homepage
        ? {
            title: crawl.homepage.title,
            wordCount: crawl.homepage.wordCount,
            schemaObjects: crawl.homepage.schemaObjects.length,
            schemaParseErrors: crawl.homepage.schemaParseErrors,
          }
        : null,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

function withTimeout(promise, timeoutMs, url) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms while scanning ${url}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser().catch(() => {});
  });
