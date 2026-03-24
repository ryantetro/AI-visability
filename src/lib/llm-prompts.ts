import {
  DimensionKey,
  PrioritizedFix,
  ScoreResult,
  WebHealthPillarKey,
  WebHealthSummary,
} from '@/types/score';

export type ReportPromptSectionKey =
  | 'aiReadiness'
  | 'contentAuthority'
  | 'websiteQuality'
  | 'performanceSecurity';

export interface ReportPromptSection {
  key: ReportPromptSectionKey;
  label: string;
  prompt: string;
  actionableFixCount: number;
}

export interface ReportPromptBundle {
  fullPrompt: string;
  remainingFixesPrompt: string;
  fixPrompts: Array<{
    checkId: string;
    label: string;
    prompt: string;
  }>;
  sectionPrompts: Partial<Record<ReportPromptSectionKey, ReportPromptSection>>;
}

export type BotTrackingRuntime = 'next' | 'express';

const BOT_TRACKING_SNIPPET_BOTS = `{
  GPTBot: 'indexing',
  'ChatGPT-User': 'indexing',
  PerplexityBot: 'citation',
  ClaudeBot: 'indexing',
  'Claude-Web': 'indexing',
  'anthropic-ai': 'training',
  CCBot: 'training',
  'cohere-ai': 'training',
  'Google-Extended': 'training',
}`;

const BOT_TRACKING_SNIPPET_REFERRERS = `{
  'chat.openai.com': 'chatgpt',
  'chatgpt.com': 'chatgpt',
  'perplexity.ai': 'perplexity',
  'gemini.google.com': 'gemini',
  'claude.ai': 'claude',
}`;

const REPORT_PROMPT_SECTION_META: Record<ReportPromptSectionKey, {
  label: string;
  dimensions?: DimensionKey[];
  pillars?: WebHealthPillarKey[];
}> = {
  aiReadiness: {
    label: 'AI Readiness',
    dimensions: ['file-presence', 'structured-data', 'ai-registration'],
  },
  contentAuthority: {
    label: 'Content & Authority',
    dimensions: ['content-signals', 'topical-authority', 'entity-clarity'],
  },
  websiteQuality: {
    label: 'Website Quality',
    pillars: ['quality'],
  },
  performanceSecurity: {
    label: 'Performance & Security',
    pillars: ['performance', 'security'],
  },
};

export function buildReportPromptBundle(url: string, score: ScoreResult): ReportPromptBundle {
  return {
    fullPrompt: buildFullReportPrompt(url, score),
    remainingFixesPrompt: buildRemainingFixesPrompt(url, score),
    fixPrompts: score.fixes.map((fix) => ({
      checkId: fix.checkId,
      label: fix.label,
      prompt: fix.copyPrompt,
    })),
    sectionPrompts: buildSectionPromptBundle(url, score),
  };
}

export function buildFullReportPrompt(url: string, score: ScoreResult): string {
  const siteContext = buildSiteContext(url);
  const derivedRequirements = buildDerivedRequirements(score.fixes);
  const aiSummary = score.dimensions
    .map((dimension) => `  - ${dimension.label}: ${dimension.percentage}% (${dimension.score}/${dimension.maxScore})`)
    .join('\n');

  const webSummary = score.webHealth ? buildWebHealthSummary(score.webHealth) : '  - Web Health: still processing or unavailable';

  const fixSummary = score.fixes.length > 0
    ? score.fixes
        .slice(0, 10)
        .map((fix, index) => {
          const lines = [
            `${index + 1}. [${fix.category.toUpperCase()}] ${fix.label} (ROI: +${fix.estimatedLift} pts, effort: ${fix.effortBand})`,
            `   Audit finding: ${fix.detail}`,
            `   Current state: ${fix.actualValue || 'Not detected'}`,
            `   Target state: ${fix.expectedValue || 'Resolve the failed check'}`,
            `   Action: ${fix.instruction}`,
          ];
          return lines.join('\n');
        })
        .join('\n\n')
    : 'No blocking fixes were identified.';

  return `You are a senior web developer, technical SEO engineer, and structured-data specialist. A client's website has been audited for AI visibility — how well AI models (ChatGPT, Claude, Perplexity, Gemini, and Claude) can discover, understand, and accurately reference the site.

## Non-Negotiable Rules
- Fix only the issues listed below unless a hard dependency must be included.
- Use the real site context below. Do not invent fake company names, fake contact details, or placeholder URLs like \`example.com\`.
- Before proposing fixes, inspect the current application, relevant project files, and existing site implementation, then use that real context to tailor the solution.
- If the tech stack is unknown, state the safest implementation assumption first, then provide the best default implementation plus short alternatives for common stacks.
- Prefer the smallest production-safe change that resolves the audit finding without breaking existing SEO, schema, routing, or crawl behavior.
- Use absolute canonical URLs in outputs unless the target format explicitly requires relative paths.
- If a detail is missing, make the safest reasonable assumption and label it clearly.

## Site Under Audit
${siteContext}

## Current Scores
- Overall: ${score.scores.overall ?? 'Pending'}/100
- AI Visibility: ${score.scores.aiVisibility}/100 (${score.bandInfo.label})
- Web Health: ${score.scores.webHealth ?? 'Pending'}/100
- Potential lift remaining: ${score.scores.potentialLift ?? 'Pending'} points

## AI Visibility Breakdown
${aiSummary}

## Web Health Breakdown
${webSummary}

## Priority Fixes (ordered by ROI)
${fixSummary}

${derivedRequirements}

## Your Task
First inspect the current application, relevant project files, and existing site implementation, then provide a complete, production-ready implementation plan for all remaining fixes above.

## Output Contract
For each fix above, return:
1. **Fix name**
2. **Why this matters for AI** — one sentence tied directly to discoverability, comprehension, or answer quality.
3. **Exact code or configuration** — full file content for new files, or exact insertion/replacement snippets for existing files. Use fenced code blocks with the correct language tag.
4. **File path and placement** — specify exactly where the code belongs in the project.
5. **Platform-specific notes** — if the implementation differs for common stacks, give the primary recommendation first, then short alternatives.
6. **Verification** — the exact URL to open or command to run after deployment.

## Quality Bar
- Work through the fixes in the order listed, highest ROI first.
- Keep implementations standards-compliant and production-safe.
- Call out hard dependencies before the dependent fix.
- Do not return high-level advice without implementation details.
- If a new file is required, return the entire file contents.`;
}

export function buildBotTrackingSnippet(runtime: BotTrackingRuntime, appUrl: string, siteKey: string): string {
  return runtime === 'next'
    ? buildNextBotTrackingSnippet(appUrl, siteKey)
    : buildExpressBotTrackingSnippet(appUrl, siteKey);
}

export function buildBotTrackingInstallPrompt({
  domain,
  runtime,
  appUrl,
  siteKey,
}: {
  domain: string;
  runtime: BotTrackingRuntime;
  appUrl: string;
  siteKey: string;
}): string {
  const snippet = buildBotTrackingSnippet(runtime, appUrl, siteKey);
  const runtimeLabel = runtime === 'next' ? 'Next.js / Vercel' : 'Express / Node';
  const primaryFile = runtime === 'next' ? 'middleware.ts or middleware.js at the project root' : 'the main server entry file where app middleware is registered';
  const placementNote = runtime === 'next'
    ? 'If the project already has middleware, merge this logic into the existing middleware instead of replacing unrelated auth, redirects, rewrites, or header logic.'
    : 'Insert this as middleware before the main route handlers, and preserve any existing middleware order that affects auth, security, logging, or response behavior.';

  return `You are a senior web developer implementing an existing AISO bot-tracking integration inside a customer's website project.

## Role / Task
Add AISO AI bot tracking to the customer's site using the existing AISO tracking endpoint and the selected runtime below.

## Non-Negotiable Rules
- This task is for the customer's own website/application only. Do not modify AISO itself.
- Do not add or change AISO backend routes, middleware, database tables, migrations, auth, rate limiting, or tracking services.
- Do not invent a new \`/api/track\` route in the target project. The tracking endpoint already exists on AISO and must be called exactly as provided below.
- Do not create new database tables, analytics pipelines, or logging infrastructure in the target project for this feature.
- Inspect the target project's current middleware/server setup before changing anything, then make the smallest production-safe change.
- Preserve the project's existing auth, redirects, rewrites, security headers, logging, and error handling behavior.
- Use the selected runtime only: ${runtimeLabel}.
- Do not replace the real domain, app URL, or site key with placeholders.
- Adapt syntax only when necessary to fit the target project's existing code style or TypeScript setup.

## AISO Integration Details
- Customer domain: ${domain}
- Selected runtime: ${runtimeLabel}
- AISO tracking endpoint: ${appUrl}/api/track
- Site key: ${siteKey}
- Purpose: detect known AI crawler user agents on the customer's server and send a fire-and-forget POST to AISO when one is detected.

## File / Placement Guidance
- Primary target location: ${primaryFile}
- Placement rule: ${placementNote}

## Ready-to-Use Snippet
\`\`\`javascript
${snippet}
\`\`\`

## Implementation Expectations
- Reuse the target project's existing middleware/server structure rather than inventing a new architecture.
- If the target project already has middleware logic, merge the AI bot detection into it cleanly.
- Keep the AISO POST non-blocking so normal page responses are not delayed or broken if the request fails.
- Do not rename the JSON payload keys (\`sk\`, \`bn\`, \`bc\`, \`p\`, \`ua\`).
- Do not send a separate domain field; the site key resolves the domain server-side inside AISO.

## What to Return
After inspecting the target project, return the complete implementation with:

1. **Exact code changes** in fenced code blocks with the correct language tag.
2. **File path and placement** — exactly which file to edit and where the code belongs.
3. **Short explanation** — briefly explain why this implementation is correct and how it preserves existing behavior.
4. **Deployment / verification steps** — the exact command to deploy or run locally and how to confirm the tracking request is firing.

## Verification Checklist
- Confirm the middleware runs on incoming page requests.
- Confirm AI bot user agents are detected by substring match.
- Confirm the POST goes to ${appUrl}/api/track exactly.
- Confirm the payload contains \`sk\`, \`bn\`, \`bc\`, \`p\`, and \`ua\`.
- Confirm normal request handling still works even if the tracking POST fails.

Do not answer with a system redesign, backend architecture proposal, database schema, or AISO-side implementation. Return only the customer-site implementation needed to install this integration safely.`;
}

export function buildFixPrompt(url: string, fix: PrioritizedFix): string {
  const siteContext = buildSiteContext(url);
  const checkContext = getCheckContext(fix.checkId);
  const derivedRequirements = buildDerivedRequirements([fix]);

  return `You are a senior web developer, technical SEO engineer, and implementation specialist. Implement the following fix for the audited site below.

## Non-Negotiable Rules
- Fix only the issue described below unless a hard dependency is required.
- Use the real domain and site context below; do not use placeholder brands, fake URLs, or fake business details.
- Before proposing fixes, inspect the current application, relevant project files, and existing site implementation, then use that real context to tailor the solution.
- If the stack is unknown, state the safest assumption first, then provide the best default implementation and short alternatives for common stacks.
- Prefer the smallest production-safe change that resolves the check cleanly.

## Site Under Audit
${siteContext}

## Problem
**${fix.label}**
Category: ${fix.category === 'ai' ? 'AI Visibility' : 'Web Health'} → ${fix.dimension}
Score impact: +${fix.estimatedLift} points | Effort: ${fix.effortBand} | Urgency: ${fix.urgency}/5

## Audit Finding
${fix.detail}

## Current State
${fix.actualValue || 'The audit could not detect this element on the site.'}

## Required End State
${fix.expectedValue || 'Resolve the failed audit check.'}

${checkContext}
## Implementation Instructions
${fix.instruction}

${derivedRequirements}

## What to Return
After inspecting the current application, relevant project files, and existing site implementation, provide the **complete, production-ready implementation** — not a summary or outline:

1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like \`llms.txt\` or \`robots.txt\`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.
2. **File path** — where this file or change belongs (e.g., \`public/robots.txt\`, \`<head>\` of the homepage template, a server config file).
3. **Placement instructions** — exactly where to insert it if the file already exists.
4. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups.
5. **Why this matters for AI** — one sentence tied directly to this check.
6. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.

Do not answer with pseudocode, placeholders, or generic strategy notes.`;
}

export function buildRemainingFixesPrompt(url: string, score: ScoreResult): string {
  const siteContext = buildSiteContext(url);
  const derivedRequirements = buildDerivedRequirements(score.fixes);
  const quickWins = score.fixes.filter((f) => f.effortBand === 'quick');
  const mediumFixes = score.fixes.filter((f) => f.effortBand === 'medium');
  const technicalFixes = score.fixes.filter((f) => f.effortBand === 'technical');

  const formatGroup = (fixes: PrioritizedFix[], label: string) => {
    if (fixes.length === 0) return '';
    const items = fixes
      .map((fix, i) => `  ${i + 1}. ${fix.label} [${fix.category}] — +${fix.estimatedLift} pts\n     Finding: ${fix.detail}\n     Action: ${fix.instruction}`)
      .join('\n');
    return `### ${label} (${fixes.length})\n${items}`;
  };

  const groups = [
    formatGroup(quickWins, 'Quick Wins — under 30 minutes each'),
    formatGroup(mediumFixes, 'Medium Effort — 1-2 hours each'),
    formatGroup(technicalFixes, 'Technical — may need developer time'),
  ].filter(Boolean).join('\n\n');

  return `You are a senior web developer, technical SEO engineer, and delivery lead planning the implementation roadmap for the audited site below.

## Non-Negotiable Rules
- Use the real domain and site context below. Do not use placeholder names or fake URLs.
- Before planning fixes, inspect the current application, relevant project files, and existing site implementation, then use that real context to tailor the roadmap.
- If the stack is unknown, state assumptions briefly before the roadmap.
- Prefer the smallest production-safe change that resolves each issue cleanly.
- Keep the plan implementation-oriented: code, files, verification, and dependencies.

## Site Under Audit
${siteContext}

## Current Scores
- Overall: ${score.scores.overall ?? 'Pending'}/100
- AI Visibility: ${score.scores.aiVisibility}/100
- Web Health: ${score.scores.webHealth ?? 'Pending'}/100

## All Remaining Fixes (grouped by effort)
${groups || 'No remaining fixes.'}

${derivedRequirements}

## Your Task
Inspect the current application, relevant project files, and existing site implementation first, then create a step-by-step implementation plan that a single developer can follow:

1. **Start with quick wins** — list them in order with the exact code/config for each. These should be completable in one sitting.
2. **Then medium effort** — for each, provide the complete implementation with file paths and code.
3. **Finally technical items** — provide detailed implementation guidance with any architectural decisions explained.

For every fix, include:
- The exact code or file content (full, not abbreviated)
- Where it goes in the project
- A verification URL or command
- Any dependencies on other fixes (e.g., "robots.txt must exist before adding Sitemap directive to it")

Format the plan as a numbered checklist so each step can be checked off as completed. Do not drift into unrelated recommendations.`;
}

function buildSectionPromptBundle(url: string, score: ScoreResult): Partial<Record<ReportPromptSectionKey, ReportPromptSection>> {
  const bundle: Partial<Record<ReportPromptSectionKey, ReportPromptSection>> = {};

  (Object.keys(REPORT_PROMPT_SECTION_META) as ReportPromptSectionKey[]).forEach((sectionKey) => {
    const fixes = getSectionFixes(score, sectionKey);
    if (fixes.length === 0) return;

    bundle[sectionKey] = {
      key: sectionKey,
      label: REPORT_PROMPT_SECTION_META[sectionKey].label,
      prompt: buildSectionPrompt(url, score, sectionKey, fixes),
      actionableFixCount: fixes.length,
    };
  });

  return bundle;
}

function buildNextBotTrackingSnippet(appUrl: string, siteKey: string): string {
  return `import { NextResponse } from 'next/server';

const AI_BOTS = ${BOT_TRACKING_SNIPPET_BOTS};

const AI_REFERRERS = ${BOT_TRACKING_SNIPPET_REFERRERS};

export function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  // Check for AI bot crawlers
  for (const [bot, cat] of Object.entries(AI_BOTS)) {
    if (ua.includes(bot)) {
      fetch('${appUrl}/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sk: '${siteKey}',
          bn: bot,
          bc: cat,
          p: request.nextUrl.pathname,
          ua,
        }),
      }).catch(() => {});
      break;
    }
  }

  // Check for human visitors arriving from AI engines
  const referer = request.headers.get('referer') || '';
  if (referer) {
    try {
      const refHost = new URL(referer).hostname;
      for (const [host, engine] of Object.entries(AI_REFERRERS)) {
        if (refHost === host || refHost.endsWith('.' + host)) {
          fetch('${appUrl}/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sk: '${siteKey}',
              t: 'ref',
              se: engine,
              ref: referer.slice(0, 2048),
              p: request.nextUrl.pathname,
              ua,
            }),
          }).catch(() => {});
          break;
        }
      }
    } catch {}
  }

  return NextResponse.next();
}`;
}

function buildExpressBotTrackingSnippet(appUrl: string, siteKey: string): string {
  return `const BOTS = ${BOT_TRACKING_SNIPPET_BOTS};

const AI_REFERRERS = ${BOT_TRACKING_SNIPPET_REFERRERS};

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';

  // Check for AI bot crawlers
  for (const [bot, cat] of Object.entries(BOTS)) {
    if (ua.includes(bot)) {
      fetch('${appUrl}/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sk: '${siteKey}',
          bn: bot,
          bc: cat,
          p: req.path,
          ua,
        }),
      }).catch(() => {});
      break;
    }
  }

  // Check for human visitors arriving from AI engines
  const referer = req.headers['referer'] || '';
  if (referer) {
    try {
      const refHost = new URL(referer).hostname;
      for (const [host, engine] of Object.entries(AI_REFERRERS)) {
        if (refHost === host || refHost.endsWith('.' + host)) {
          fetch('${appUrl}/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sk: '${siteKey}',
              t: 'ref',
              se: engine,
              ref: referer.slice(0, 2048),
              p: req.path,
              ua,
            }),
          }).catch(() => {});
          break;
        }
      }
    } catch {}
  }

  next();
});`;
}

function buildSectionPrompt(
  url: string,
  score: ScoreResult,
  sectionKey: ReportPromptSectionKey,
  fixes: PrioritizedFix[]
): string {
  const meta = REPORT_PROMPT_SECTION_META[sectionKey];
  const sectionScore = getSectionScore(score, sectionKey);
  const sectionBreakdown = buildSectionBreakdown(score, sectionKey);
  const siteContext = buildSiteContext(url);
  const derivedRequirements = buildDerivedRequirements(fixes);
  const fixSummary = fixes
    .map((fix, index) => {
      const lines = [
        `${index + 1}. [${fix.category.toUpperCase()}] ${fix.label} (ROI: +${fix.estimatedLift} pts, effort: ${fix.effortBand})`,
        `   Audit finding: ${fix.detail}`,
        `   Current state: ${fix.actualValue || 'Not detected'}`,
        `   Target state: ${fix.expectedValue || 'Resolve the failed check'}`,
        `   Action: ${fix.instruction}`,
      ];
      return lines.join('\n');
    })
    .join('\n\n');

  return `You are a senior web developer, technical SEO engineer, and structured-data specialist. A client's website has been audited, and you are fixing only the ${meta.label} issues for the site below.

## Non-Negotiable Rules
- Fix only the ${meta.label} issues listed below unless one is a hard dependency of another.
- Use the real domain and site context below. Do not use placeholder company names, fake contact details, or \`example.com\` URLs.
- Before proposing fixes, inspect the current application, relevant project files, and existing site implementation, then use that real context to tailor the solution.
- If the site stack is unknown, state the safest implementation assumption first, then provide the best default implementation plus short common-stack variations.
- Prefer the smallest production-safe change that resolves the audit finding without breaking existing SEO, schema, or crawl behavior.
- If information is missing, make the safest reasonable assumption and label it clearly.

## Site Under Audit
${siteContext}

## Section
- Section: ${meta.label}
- Current section score: ${formatScoreValue(sectionScore)}
- Actionable fixes in this section: ${fixes.length}

## Relevant Breakdown
${sectionBreakdown}

## Section Fixes To Implement
${fixSummary}

${derivedRequirements}

## Your Task
First inspect the current application, relevant project files, and existing site implementation, then provide a complete, production-ready implementation for only the ${meta.label} issues listed above.

For each fix, include:
1. **Exact code or configuration** — provide the full file content or code snippet, not pseudocode.
2. **File path and placement** — specify exactly where the change belongs.
3. **Platform-specific notes** — if common stacks need different instructions, note the variation.
4. **Why this matters** — one sentence explaining how this change improves this section of the audit.
5. **Verification** — the exact URL to visit or command to run to confirm the fix is live.

## Quality Bar
- Use the real site domain in examples and generated files.
- Return full file contents for new files and exact insertion snippets for existing files.
- Keep implementations standards-compliant and safe for production.
- Do not include fixes from other sections unless one is a hard dependency. If there is a dependency, call it out explicitly before the implementation.
- Do not answer with generic advice, pseudocode, or placeholder content.`;
}

function buildSiteContext(url: string): string {
  const normalizedUrl = normalizeUrl(url);
  const origin = getOrigin(url);
  const hostname = getHostname(url);

  return [
    `- URL: ${normalizedUrl}`,
    `- Canonical host: ${origin}`,
    `- Domain: ${hostname}`,
    '- Use this real domain in all generated examples, file contents, and verification steps.',
  ].join('\n');
}

function buildDerivedRequirements(fixes: PrioritizedFix[]): string {
  const checkIds = new Set(fixes.map((fix) => fix.checkId));
  const requirements: string[] = [];

  if (checkIds.has('sd-org-schema') || checkIds.has('sd-completeness')) {
    requirements.push(
      '- Ensure the Organization or LocalBusiness schema is complete enough to satisfy the audit, including at minimum `name`, `url`, plus at least two of `description`, `logo`, `sameAs`, or `contactPoint` when that information exists in the app.'
    );
  }

  if (checkIds.has('sd-org-schema') || checkIds.has('sd-faq') || checkIds.has('sd-validation')) {
    requirements.push(
      '- Inspect any existing JSON-LD already present in the application and fix malformed, conflicting, duplicate, or unclassifiable schema blocks so that all schema on the site validates cleanly.'
    );
  }

  if (checkIds.has('sd-faq')) {
    requirements.push(
      '- Only add FAQ schema for real on-site FAQ content, or create matching visible FAQ content if it is required for the schema to be truthful and production-safe.'
    );
  }

  if (requirements.length === 0) return '';

  return `## Derived Requirements\n${requirements.join('\n')}`;
}

function normalizeUrl(url: string): string {
  try {
    return new URL(url).toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getSectionFixes(score: ScoreResult, sectionKey: ReportPromptSectionKey): PrioritizedFix[] {
  const meta = REPORT_PROMPT_SECTION_META[sectionKey];
  return score.fixes.filter((fix) => {
    if (meta.dimensions?.includes(fix.dimension as DimensionKey)) return true;
    if (meta.pillars?.includes(fix.dimension as WebHealthPillarKey)) return true;
    return false;
  });
}

function getSectionScore(score: ScoreResult, sectionKey: ReportPromptSectionKey): number | null {
  const meta = REPORT_PROMPT_SECTION_META[sectionKey];

  if (meta.dimensions?.length) {
    const matching = score.dimensions.filter((dimension) => meta.dimensions?.includes(dimension.key));
    if (matching.length === 0) return null;
    return Math.round(matching.reduce((sum, dimension) => sum + dimension.percentage, 0) / matching.length);
  }

  if (meta.pillars?.length) {
    const pillars = score.webHealth?.pillars?.filter((pillar) => meta.pillars?.includes(pillar.key)) ?? [];
    const values = pillars
      .map((pillar) => pillar.percentage)
      .filter((value): value is number => value !== null);

    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  return null;
}

function buildSectionBreakdown(score: ScoreResult, sectionKey: ReportPromptSectionKey): string {
  const meta = REPORT_PROMPT_SECTION_META[sectionKey];

  if (meta.dimensions?.length) {
    const lines = score.dimensions
      .filter((dimension) => meta.dimensions?.includes(dimension.key))
      .map((dimension) => `- ${dimension.label}: ${dimension.percentage}% (${dimension.score}/${dimension.maxScore})`);
    return lines.join('\n');
  }

  const lines = score.webHealth?.pillars
    ?.filter((pillar) => meta.pillars?.includes(pillar.key))
    .map((pillar) => `- ${pillar.label}: ${pillar.percentage ?? 'Pending'}% (${pillar.score}/${pillar.maxScore})`) ?? [];

  return lines.join('\n') || '- No section breakdown available';
}

function formatScoreValue(value: number | null): string {
  return value === null ? 'Pending' : `${value}/100`;
}

function buildWebHealthSummary(webHealth: WebHealthSummary): string {
  if (webHealth.status !== 'complete') {
    return '  - Web Health: unavailable';
  }

  const pillars = webHealth.pillars
    .map((pillar) => `  - ${pillar.label}: ${pillar.percentage ?? 'Unavailable'}% (${pillar.score}/${pillar.maxScore})`)
    .join('\n');

  return `${pillars}\n  - Source: ${webHealth.source || 'heuristic'}`;
}

/**
 * Returns check-specific technical context to include in fix prompts.
 * This gives the LLM deeper understanding of what the check measures
 * and what a correct implementation looks like.
 */
function getCheckContext(checkId: string): string {
  const contexts: Record<string, string> = {
    'fp-llms-txt': `## Technical Context
The \`llms.txt\` file is a plain text file at the site root (\`/llms.txt\`) that helps AI models understand your organization. It follows a simple format:
- Line 1: Organization/site name
- Following lines: A brief description of what the organization does, key services, and links to important pages
- Include URLs to your most important pages (about, services, contact)
- Keep it concise but informative — think of it as a structured elevator pitch for AI crawlers

Example structure:
\`\`\`
# Company Name
> Brief one-line description

## About
Paragraph about the company.

## Links
- [About](/about)
- [Services](/services)
- [Contact](/contact)
\`\`\`
`,
    'fp-robots-txt': `## Technical Context
AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) respect robots.txt directives. The file must:
- Be served at exactly \`/robots.txt\` (site root)
- Explicitly allow AI crawlers with \`User-agent: GPTBot\` / \`Allow: /\` blocks
- Include a \`Sitemap:\` directive pointing to your sitemap.xml
- Use \`text/plain\` content type
- A blanket \`User-agent: *\` Allow is not enough — AI crawlers look for explicit permission
`,
    'fp-sitemap': `## Technical Context
The sitemap must be a valid XML sitemap at \`/sitemap.xml\`. Requirements:
- Valid XML with \`<?xml version="1.0" encoding="UTF-8"?>\` header
- Use the sitemap protocol namespace: \`xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\`
- List all canonical URLs you want AI models to index
- Include \`<lastmod>\` dates in ISO 8601 format where possible
- Keep URLs consistent (all HTTPS, with or without trailing slash — pick one)
`,
    'fp-sitemap-in-robots': `## Technical Context
The \`Sitemap:\` directive in robots.txt tells all crawlers (including AI) where to find your sitemap. Add it at the end of robots.txt as:
\`Sitemap: https://yourdomain.com/sitemap.xml\`
Use the full absolute URL, not a relative path.
`,
    'sd-org-schema': `## Technical Context
Organization JSON-LD schema goes in a \`<script type="application/ld+json">\` block in the \`<head>\` of your homepage. Required fields:
- \`@context\`: "https://schema.org"
- \`@type\`: "Organization" (or "LocalBusiness" for local businesses)
- \`name\`: Your official business name
- \`url\`: Your canonical homepage URL
- \`description\`: What your business does
- \`logo\`: URL to your logo image
- \`sameAs\`: Array of social profile URLs

This is the single most important structured data for AI — it tells models definitively who you are.
`,
    'sd-completeness': `## Technical Context
An incomplete Organization schema misses opportunities. The audit checks for these fields: \`name\`, \`url\`, \`description\`, \`logo\`, \`sameAs\`, \`contactPoint\`, \`address\` (if local). Add all that apply to your business.
`,
    'sd-faq': `## Technical Context
FAQPage schema helps AI models answer questions about your business directly. Format:
- \`@type\`: "FAQPage"
- \`mainEntity\`: Array of Question objects, each with \`name\` (the question) and \`acceptedAnswer.text\` (the answer)
- Use real questions your customers ask — check your support tickets, Google Search Console queries, or sales calls
- Place the JSON-LD in the \`<head>\` of the page where the FAQ content lives
`,
    'sd-validation': `## Technical Context
JSON-LD syntax errors make the entire schema block invisible to AI models. Common issues:
- Trailing commas in JSON objects/arrays
- Unescaped special characters in strings
- Missing closing braces or brackets
- Invalid \`@type\` values
Test with Google's Rich Results Test or the Schema.org validator.
`,
    'cs-about': `## Technical Context
The About page is one of the most crawled pages by AI models building entity profiles. It should:
- Be accessible at \`/about\` or linked clearly from the main navigation
- Contain the business name, what it does, who it serves, and its history/credentials
- Be at least 300 words of substantive content (not just a tagline)
- Include the business name in the H1 heading
`,
    'cs-service-depth': `## Technical Context
Thin service pages (under 300 words) give AI models insufficient context to recommend your business. Each service page should:
- Have a clear H1 with the service name
- Describe what the service is, who it's for, how it works, and what makes you different
- Include pricing ranges if applicable
- Link to related services (internal linking)
`,
    'cs-freshness': `## Technical Context
AI models weight freshness signals when determining site authority. Signs of freshness:
- Recent copyright year in the footer
- Blog posts or updates from the current year
- \`<meta>\` dates or \`dateModified\` in schema
- Active social media links with recent activity
`,
    'cs-contact': `## Technical Context
A dedicated contact page confirms to AI models that this is a legitimate, reachable business. Include:
- Physical address (if applicable)
- Phone number and/or email
- Business hours
- A contact form
- Link it from the main navigation and footer
`,
    'ta-focus': `## Technical Context
Topical authority means your site's pages consistently reinforce the same core topics. AI models build topic clusters — if your title says "Web Design" but your content talks about "Marketing", the signal is diluted. Align:
- Page titles with the primary service/topic
- H1 headings with the page's core subject
- Body content with the title's promise
`,
    'ta-keywords': `## Technical Context
Meta descriptions and page copy should include the terms your customers search for. This isn't keyword stuffing — it's ensuring AI models associate your site with the right queries. Focus on:
- Meta descriptions that name your service + location + value prop
- H2/H3 headings that use natural variations of your core terms
- First paragraph that states clearly what the page is about
`,
    'ta-linking': `## Technical Context
Internal links help AI models understand your site's structure and which pages are most important. Each page should link to 3+ related pages. Use descriptive anchor text (not "click here"). Create hub pages that link to all related sub-pages.
`,
    'ta-depth': `## Technical Context
Pages with fewer than 300 words are often classified as "thin content" by AI models and may be skipped during training data collection. Expand thin pages with:
- More detailed explanations of the topic
- FAQs related to the page's subject
- Case studies or examples
- Comparison tables if relevant
`,
    'ar-gptbot': `## Technical Context
GPTBot is OpenAI's web crawler. To explicitly allow it, add these lines to your robots.txt:
\`\`\`
User-agent: GPTBot
Allow: /
\`\`\`
Without explicit permission, GPTBot may skip your site or respect a blanket disallow.
`,
    'ar-perplexity': `## Technical Context
PerplexityBot crawls sites for Perplexity AI's search engine. Add to robots.txt:
\`\`\`
User-agent: PerplexityBot
Allow: /
\`\`\`
`,
    'ar-claude': `## Technical Context
ClaudeBot is Anthropic's web crawler. Add to robots.txt:
\`\`\`
User-agent: ClaudeBot
Allow: /
\`\`\`
`,
    'ar-llms-refs': `## Technical Context
The llms.txt file should link to your most important pages so AI models know which content to prioritize. Add markdown-style links:
\`\`\`
## Key Pages
- [About Us](/about)
- [Our Services](/services)
- [Contact](/contact)
- [FAQ](/faq)
\`\`\`
`,
    'whp-performance-score': `## Technical Context
PageSpeed performance score below 80 means the site is slow to load, which affects both user experience and AI crawler efficiency. Focus on:
- Compressing and lazy-loading images (use WebP/AVIF)
- Deferring non-critical JavaScript with \`defer\` or \`async\`
- Enabling gzip/brotli compression on the server
- Setting proper cache headers for static assets
- Removing unused CSS and JavaScript
`,
    'whp-lcp': `## Technical Context
Largest Contentful Paint (LCP) measures how long the biggest visible element takes to render. Target: under 2.5 seconds. Common fixes:
- Preload the LCP image: \`<link rel="preload" as="image" href="...">\`
- Serve images in modern formats (WebP/AVIF) at the correct dimensions
- Remove render-blocking CSS/JS above the fold
- Use a CDN for static assets
`,
    'whp-cls': `## Technical Context
Cumulative Layout Shift (CLS) measures visual instability. Target: under 0.10. Fixes:
- Set explicit \`width\` and \`height\` attributes on all images and videos
- Reserve space for ads and embeds with CSS \`aspect-ratio\` or min-height
- Avoid injecting content above existing content after page load
- Use \`font-display: swap\` with fallback font metrics matching the web font
`,
    'whp-tbt': `## Technical Context
Total Blocking Time (TBT) measures how long the main thread is blocked during page load. Target: under 200ms. Fixes:
- Break up long JavaScript tasks (anything over 50ms)
- Defer third-party scripts (analytics, chat widgets) with \`defer\` or load them after interaction
- Use \`requestIdleCallback\` for non-critical initialization
- Remove unused JavaScript and polyfills
`,
    'whs-https': `## Technical Context
HTTPS is mandatory for AI crawler trust. Most AI crawlers will not index HTTP-only sites. Implementation:
- Obtain an SSL certificate (free via Let's Encrypt / Certbot)
- Redirect all HTTP requests to HTTPS via server config (301 redirect)
- Update all internal links and canonical URLs to use HTTPS
- Update the sitemap.xml to use HTTPS URLs
`,
    'whs-hsts': `## Technical Context
Strict-Transport-Security header tells browsers to always use HTTPS. Add this response header:
\`Strict-Transport-Security: max-age=31536000; includeSubDomains\`
Start with a short max-age (86400 = 1 day) and increase once confirmed stable.
`,
    'whs-csp': `## Technical Context
Content-Security-Policy header prevents XSS attacks. Start with a report-only policy:
\`Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'\`
Adjust based on what your site actually loads (fonts, analytics, CDN assets). Once stable, switch to enforcing mode.
`,
    'whs-xfo': `## Technical Context
X-Frame-Options prevents your site from being embedded in iframes on other domains (clickjacking protection). Add this HTTP response header:
\`X-Frame-Options: SAMEORIGIN\`
This allows your own site to iframe itself but blocks third-party embedding. Set via your web server config, CDN headers, or framework middleware.
`,
    'whs-nosniff': `## Technical Context
X-Content-Type-Options prevents browsers from MIME-sniffing responses away from the declared content type. Add this response header:
\`X-Content-Type-Options: nosniff\`
This is a one-line server config change with zero risk of breaking anything.
`,
    'whp-seo-score': `## Technical Context
The PageSpeed SEO score audits technical SEO basics: meta tags, crawlable links, canonical URLs, hreflang, and structured data. Fix the specific findings from the Lighthouse audit — common issues include missing meta descriptions, non-crawlable links (JavaScript-only navigation), and missing canonical tags.
`,
    'whp-best-practices-score': `## Technical Context
The Lighthouse best-practices audit checks for deprecated APIs, console errors, safe resource loading (HTTPS), proper image aspect ratios, and modern JavaScript features. Address each specific finding in the audit report.
`,
    'whp-accessibility-score': `## Technical Context
Lighthouse accessibility audits check for WCAG compliance: color contrast ratios, form labels, image alt text, ARIA attributes, focus management, and semantic HTML. Each finding includes the specific element and what needs to change.
`,
    'whp-inp': `## Technical Context
Interaction to Next Paint (INP) measures responsiveness to user input. Target: under 200ms. Fixes:
- Reduce JavaScript execution during interactions
- Break up event handlers into smaller async chunks
- Use \`requestAnimationFrame\` for visual updates
- Debounce rapid-fire events (scroll, resize, input)
`,
    'whp-homepage-load': `## Technical Context
Homepage load time directly affects whether AI crawlers can efficiently index your site. Slow pages may time out during crawling. Focus on:
- Reducing server response time (TTFB under 600ms)
- Compressing HTML/CSS/JS with gzip or brotli
- Lazy-loading below-the-fold images
- Minimizing third-party script impact
`,
    'whp-average-load': `## Technical Context
If your average page load time across the site is high, AI crawlers may deprioritize your content. Identify the slowest page templates and optimize them. Common culprits: unoptimized images, heavy JavaScript bundles, slow database queries on dynamic pages.
`,
    'whp-render-mode': `## Technical Context
Client-side rendered (CSR) pages may appear empty to AI crawlers that don't execute JavaScript. Ensure core content is present in the initial HTML response:
- Use Server-Side Rendering (SSR) or Static Site Generation (SSG) for important pages
- Pre-render critical content so it appears without JavaScript
- Test by disabling JavaScript in your browser — if the page is blank, AI crawlers see it blank too
`,
    'whq-title': `## Technical Context
The homepage title tag is one of the strongest signals AI models use to identify what your site is about. It should be:
- 30-60 characters long
- Include your brand name and primary service/offering
- Be specific, not generic (e.g., "Acme Web Design | Custom Websites for Small Business" not "Welcome to Our Website")
`,
    'whq-meta-description': `## Technical Context
Meta descriptions appear in search results and are used by AI models as a summary of what the page offers. Write a compelling 120-160 character description that includes your primary service, location (if relevant), and unique value proposition.
`,
    'whq-headings': `## Technical Context
A proper heading hierarchy (H1 → H2 → H3) helps AI models parse your page structure. Rules:
- Exactly one H1 per page (your main topic)
- H2s for major sections
- H3s for subsections within H2s
- Never skip levels (e.g., H1 → H3 without an H2)
`,
    'whq-canonical': `## Technical Context
The canonical URL tag tells search engines and AI crawlers which version of a page is the "official" one. Add to the \`<head>\`:
\`<link rel="canonical" href="https://yourdomain.com/page-path" />\`
This prevents duplicate content issues when the same page is accessible via multiple URLs.
`,
    'whq-open-graph': `## Technical Context
Open Graph tags control how your pages appear when shared on social media and are used by AI models for content understanding. Required tags:
- \`og:title\` — page title
- \`og:description\` — page description
- \`og:image\` — preview image URL (1200x630px recommended)
- \`og:url\` — canonical URL
- \`og:type\` — "website" for the homepage
`,
    'whq-twitter': `## Technical Context
Twitter Card meta tags control how your content appears when shared on X/Twitter. Required tags:
- \`twitter:card\` — "summary_large_image" for visual impact
- \`twitter:title\` — page title
- \`twitter:description\` — page description
- \`twitter:image\` — preview image URL
`,
    'whq-viewport': `## Technical Context
The viewport meta tag ensures your site renders correctly on mobile devices. Add to \`<head>\`:
\`<meta name="viewport" content="width=device-width, initial-scale=1">\`
Without this, mobile users see a desktop-sized page zoomed out, and Lighthouse penalizes the site.
`,
    'whq-lang': `## Technical Context
The \`lang\` attribute on the \`<html>\` tag tells browsers and AI models what language the content is in. Set it to the correct BCP 47 language code:
\`<html lang="en">\` for English, \`<html lang="es">\` for Spanish, etc.
`,
    'whq-charset': `## Technical Context
Character encoding declaration prevents garbled text. Add as the first element in \`<head>\`:
\`<meta charset="UTF-8">\`
`,
    'whq-favicon': `## Technical Context
A favicon is a trust signal — sites without one appear unfinished. Add to \`<head>\`:
\`<link rel="icon" href="/favicon.ico" type="image/x-icon">\`
Or use SVG: \`<link rel="icon" href="/favicon.svg" type="image/svg+xml">\`
`,
    'whq-schema-detail': `## Technical Context
Invalid or malformed JSON-LD structured data is worse than no structured data — it can confuse AI models. Validate all \`<script type="application/ld+json">\` blocks:
- Ensure valid JSON (no trailing commas, proper quoting)
- Use correct Schema.org types and properties
- Test at https://validator.schema.org/
`,
    'ec-name': `## Technical Context
Brand name consistency helps AI models build a confident entity profile. Use the exact same brand name in:
- Page titles (every page should include the brand)
- The Organization schema \`name\` field
- The site's H1 or header
- Meta descriptions
Variations (Inc., LLC, abbreviations) dilute the signal.
`,
    'ec-social': `## Technical Context
Social profile links help AI models verify your identity across platforms. Add links to your active social profiles in:
- The site footer (visible on every page)
- The Contact page
- The Organization schema \`sameAs\` array
Only link to profiles you actively maintain.
`,
    'ec-authority': `## Technical Context
The \`sameAs\` property in Organization schema tells AI models which social profiles belong to this entity. Add an array of URLs:
\`"sameAs": ["https://twitter.com/yourbrand", "https://linkedin.com/company/yourbrand", "https://facebook.com/yourbrand"]\`
This helps AI models cross-reference your identity across the web.
`,
  };

  return contexts[checkId] || '';
}
