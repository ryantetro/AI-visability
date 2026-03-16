require('../scripts/register-ts.cjs');

const fs = require('fs');
const path = require('path');
const { crawlSite } = require('../src/lib/crawler/index.ts');
const { scoreCrawlData } = require('../src/lib/scorer/index.ts');
const { closeBrowser } = require('../src/lib/crawler/browser.ts');

const SITE_TIMEOUT_MS = 45_000;
const fixturePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../tests/live-fixtures/saas-sites.json');

async function main() {
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const results = [];
  let failures = 0;

  for (const fixture of fixtures) {
    console.error(`Scanning ${fixture.name} (${fixture.url})...`);
    try {
      const crawl = await withTimeout(crawlSite(fixture.url), SITE_TIMEOUT_MS, fixture.url);
      const score = scoreCrawlData(crawl);
      const checks = evaluateFixture(fixture, crawl);
      const failedChecks = checks.filter((check) => !check.pass);
      failures += failedChecks.length > 0 ? 1 : 0;

      results.push({
        name: fixture.name,
        url: fixture.url,
        category: fixture.category,
        why: fixture.why,
        pass: failedChecks.length === 0,
        failedChecks,
        checks,
        observed: {
          pages: crawl.pages.length,
          robotsExists: crawl.robotsTxt.exists,
          sitemapExists: crawl.sitemap.exists,
          sitemapAccessStatus: crawl.sitemap.accessStatus,
          sitemapReferencedInRobots: crawl.sitemap.referencedInRobots,
          llmsExists: crawl.llmsTxt.exists,
          llmsLinks: crawl.llmsTxt.links.length,
          renderMode: crawl.renderReadiness.mode,
          score: score.scores.aiVisibility,
          band: score.bandInfo.label,
        },
      });
    } catch (error) {
      failures += 1;
      results.push({
        name: fixture.name,
        url: fixture.url,
        category: fixture.category,
        why: fixture.why,
        pass: false,
        failedChecks: [{ id: 'scan', message: error instanceof Error ? error.message : String(error) }],
        checks: [],
      });
    }
  }

  console.log(JSON.stringify({ fixturePath, failures, results }, null, 2));
  if (failures > 0) {
    process.exitCode = 1;
  }
}

function evaluateFixture(fixture, crawl) {
  const checks = [];
  checks.push({
    id: 'homepage',
    pass: Boolean(crawl.homepage?.title),
    message: crawl.homepage?.title ? `Homepage title: ${crawl.homepage.title}` : 'Homepage title missing',
  });
  checks.push({
    id: 'minPages',
    pass: crawl.pages.length >= (fixture.expect.minPages || 1),
    message: `Expected at least ${fixture.expect.minPages || 1} pages, saw ${crawl.pages.length}`,
  });
  checks.push(expectRobots(fixture.expect.robots, crawl));
  checks.push(expectSitemap(fixture.expect.sitemap, crawl));
  checks.push(expectLlms(fixture.expect.llms, crawl));
  return checks;
}

function expectRobots(expectation, crawl) {
  if (expectation !== 'present') {
    return { id: 'robots', pass: true, message: 'No robots expectation' };
  }

  return {
    id: 'robots',
    pass: crawl.robotsTxt.exists,
    message: crawl.robotsTxt.exists ? 'robots.txt present' : 'robots.txt missing',
  };
}

function expectSitemap(expectation, crawl) {
  if (expectation === 'optional') {
    return { id: 'sitemap', pass: true, message: 'No sitemap expectation' };
  }

  const pass =
    crawl.sitemap.exists ||
    crawl.sitemap.referencedInRobots ||
    crawl.sitemap.accessStatus === 'blocked';

  return {
    id: 'sitemap',
    pass,
    message: `sitemap exists=${crawl.sitemap.exists}, referenced=${crawl.sitemap.referencedInRobots}, access=${crawl.sitemap.accessStatus}`,
  };
}

function expectLlms(expectation, crawl) {
  if (expectation !== 'present') {
    return { id: 'llms', pass: true, message: 'No llms expectation' };
  }

  return {
    id: 'llms',
    pass: crawl.llmsTxt.exists,
    message: crawl.llmsTxt.exists ? `llms.txt present with ${crawl.llmsTxt.links.length} links` : 'llms.txt missing',
  };
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
