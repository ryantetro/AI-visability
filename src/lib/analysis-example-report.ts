// Auto-generated from a real scan of https://stripe.com
// Generated at: 2026-03-16T05:16:51.563Z
// To regenerate: npx tsx scripts/capture-example-scan.ts

export const analysisExampleReport = {
  "id": "example-report",
  "url": "https://stripe.com",
  "hasPaid": false,
  "share": {
    "publicUrl": "/analysis?example=1",
    "badgeSvgUrl": "/api/badge/example-report",
    "opengraphImageUrl": "https://images.stripeassets.com/fzn2n1nzq965/XtX984S1GJVsVOXFC7kMu/01988281e867728dfb09aa7793a6e3b9/Stripe.jpg?q=80"
  },
  "scores": {
    "aiVisibility": 84,
    "webHealth": 69,
    "overall": 78,
    "potentialLift": 22
  },
  "enrichments": {
    "webHealth": {
      "status": "complete",
      "startedAt": 1773638181562,
      "completedAt": 1773638211562
    }
  },
  "copyToLlm": {
    "fullPrompt": "You are a senior web developer and SEO engineer. A client's website has been audited for AI visibility — how well AI models (ChatGPT, Claude, Perplexity, etc.) can discover, understand, and accurately reference the site.\n\n## Site Under Audit\nURL: https://stripe.com\n\n## Current Scores\n- Overall: 78/100\n- AI Visibility: 84/100 (AI Ready)\n- Web Health: 69/100\n- Potential lift remaining: 22 points\n\n## AI Visibility Breakdown\n  - File Presence: 100% (20/20)\n  - Structured Data: 0% (0/15)\n  - Content Signals: 100% (20/20)\n  - Topical Authority: 100% (20/20)\n  - Entity Clarity: 100% (10/10)\n  - AI Registration: 100% (10/10)\n\n## Web Health Breakdown\n  - Performance: 17% (4/24)\n  - Website Quality: 90% (57/63)\n  - Trust & Security: 100% (30/30)\n  - Source: heuristic\n\n## Priority Fixes (ordered by ROI)\n1. [WEB] Homepage response speed (ROI: +12 pts, effort: medium)\n   Audit finding: Homepage loaded in 7095ms during crawl.\n   Current state: Homepage loaded in 7095ms during crawl.\n   Target state: Homepage load time under 2.5 seconds\n   Action: Improve homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.\n\n2. [AI] Organization schema markup (ROI: +8 pts, effort: medium)\n   Audit finding: No Organization schema found. Add JSON-LD markup to help AI understand your business.\n   Current state: No Organization schema found. Add JSON-LD markup to help AI understand your business.\n   Target state: A valid Organization or LocalBusiness JSON-LD block on the homepage\n   Action: Add Organization or LocalBusiness JSON-LD schema to your homepage.\n\n3. [WEB] Structured data is parseable (ROI: +6 pts, effort: quick)\n   Audit finding: Detected 1 malformed JSON-LD block(s).\n   Current state: Detected 1 malformed JSON-LD block(s).\n   Target state: Valid structured data with no parse failures\n   Action: Add valid JSON-LD on the homepage and fix any malformed structured data blocks.\n\n4. [WEB] Average page load speed (ROI: +8 pts, effort: medium)\n   Audit finding: Average page load time was 3040ms across 10 pages.\n   Current state: Average page load time was 3040ms across 10 pages.\n   Target state: Average crawl load time under 3 seconds\n   Action: Speed up slow templates and reduce bulky assets across important pages.\n\n5. [AI] FAQ schema markup (ROI: +4 pts, effort: medium)\n   Audit finding: No FAQ schema found. FAQ markup helps AI models generate answers about your business.\n   Current state: No FAQ schema found. FAQ markup helps AI models generate answers about your business.\n   Target state: A valid FAQPage schema describing real customer questions\n   Action: Create FAQ structured data for common questions about your business.\n\n6. [AI] Schema validity (ROI: +3 pts, effort: quick)\n   Audit finding: Detected 3 malformed JSON-LD block(s).\n   Current state: Detected 3 malformed JSON-LD block(s).\n   Target state: Schema blocks parse without JSON errors\n   Action: Fix JSON-LD syntax errors in your schema markup.\n\n## Your Task\nFor each fix above, provide a complete implementation:\n\n1. **Exact code or configuration** — provide the full file content or code snippet, not pseudocode. Use fenced code blocks with the appropriate language tag.\n2. **File path and placement** — specify exactly where this goes in the project (e.g., `public/llms.txt`, inject into `<head>` of `index.html`, add to `.htaccess`, etc.).\n3. **Platform-specific notes** — if the implementation differs for common platforms (WordPress, Next.js, Shopify, static HTML), note the variation.\n4. **Why this matters for AI** — one sentence explaining how this specific change improves AI model discoverability or accuracy.\n5. **Verification** — the exact URL to visit or command to run to confirm the fix is live.\n\nWork through the fixes in the order listed (highest ROI first). If a fix depends on another fix being completed first, note the dependency.",
    "remainingFixesPrompt": "You are a senior web developer planning the implementation roadmap for https://stripe.com.\n\n## Current Scores\n- Overall: 78/100\n- AI Visibility: 84/100\n- Web Health: 69/100\n\n## All Remaining Fixes (grouped by effort)\n### Quick Wins — under 30 minutes each (2)\n  1. Structured data is parseable [web] — +6 pts\n     Finding: Detected 1 malformed JSON-LD block(s).\n     Action: Add valid JSON-LD on the homepage and fix any malformed structured data blocks.\n  2. Schema validity [ai] — +3 pts\n     Finding: Detected 3 malformed JSON-LD block(s).\n     Action: Fix JSON-LD syntax errors in your schema markup.\n\n### Medium Effort — 1-2 hours each (4)\n  1. Homepage response speed [web] — +12 pts\n     Finding: Homepage loaded in 7095ms during crawl.\n     Action: Improve homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.\n  2. Organization schema markup [ai] — +8 pts\n     Finding: No Organization schema found. Add JSON-LD markup to help AI understand your business.\n     Action: Add Organization or LocalBusiness JSON-LD schema to your homepage.\n  3. Average page load speed [web] — +8 pts\n     Finding: Average page load time was 3040ms across 10 pages.\n     Action: Speed up slow templates and reduce bulky assets across important pages.\n  4. FAQ schema markup [ai] — +4 pts\n     Finding: No FAQ schema found. FAQ markup helps AI models generate answers about your business.\n     Action: Create FAQ structured data for common questions about your business.\n\n## Your Task\nCreate a step-by-step implementation plan that a single developer can follow:\n\n1. **Start with quick wins** — list them in order with the exact code/config for each. These should be completable in one sitting.\n2. **Then medium effort** — for each, provide the complete implementation with file paths and code.\n3. **Finally technical items** — provide detailed implementation guidance with any architectural decisions explained.\n\nFor every fix, include:\n- The exact code or file content (full, not abbreviated)\n- Where it goes in the project\n- A verification URL or command\n- Any dependencies on other fixes (e.g., \"robots.txt must exist before adding Sitemap directive to it\")\n\nFormat the plan as a numbered checklist so each step can be checked off as completed.",
    "fixPrompts": [
      {
        "checkId": "whp-homepage-load",
        "label": "Homepage response speed",
        "prompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Homepage response speed**\nCategory: Web Health → performance\nScore impact: +12 points | Effort: medium | Urgency: 4/5\n\n## Audit Finding\nHomepage loaded in 7095ms during crawl.\n\n## Current State\nHomepage loaded in 7095ms during crawl.\n\n## Required End State\nHomepage load time under 2.5 seconds\n\n## Technical Context\nHomepage load time directly affects whether AI crawlers can efficiently index your site. Slow pages may time out during crawling. Focus on:\n- Reducing server response time (TTFB under 600ms)\n- Compressing HTML/CSS/JS with gzip or brotli\n- Lazy-loading below-the-fold images\n- Minimizing third-party script impact\n\n## Implementation Instructions\nImprove homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working."
      },
      {
        "checkId": "sd-org-schema",
        "label": "Organization schema markup",
        "prompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Organization schema markup**\nCategory: AI Visibility → structured-data\nScore impact: +8 points | Effort: medium | Urgency: 5/5\n\n## Audit Finding\nNo Organization schema found. Add JSON-LD markup to help AI understand your business.\n\n## Current State\nNo Organization schema found. Add JSON-LD markup to help AI understand your business.\n\n## Required End State\nA valid Organization or LocalBusiness JSON-LD block on the homepage\n\n## Technical Context\nOrganization JSON-LD schema goes in a `<script type=\"application/ld+json\">` block in the `<head>` of your homepage. Required fields:\n- `@context`: \"https://schema.org\"\n- `@type`: \"Organization\" (or \"LocalBusiness\" for local businesses)\n- `name`: Your official business name\n- `url`: Your canonical homepage URL\n- `description`: What your business does\n- `logo`: URL to your logo image\n- `sameAs`: Array of social profile URLs\n\nThis is the single most important structured data for AI — it tells models definitively who you are.\n\n## Implementation Instructions\nAdd Organization or LocalBusiness JSON-LD schema to your homepage.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working."
      },
      {
        "checkId": "whq-schema-detail",
        "label": "Structured data is parseable",
        "prompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Structured data is parseable**\nCategory: Web Health → quality\nScore impact: +6 points | Effort: quick | Urgency: 3/5\n\n## Audit Finding\nDetected 1 malformed JSON-LD block(s).\n\n## Current State\nDetected 1 malformed JSON-LD block(s).\n\n## Required End State\nValid structured data with no parse failures\n\n## Technical Context\nInvalid or malformed JSON-LD structured data is worse than no structured data — it can confuse AI models. Validate all `<script type=\"application/ld+json\">` blocks:\n- Ensure valid JSON (no trailing commas, proper quoting)\n- Use correct Schema.org types and properties\n- Test at https://validator.schema.org/\n\n## Implementation Instructions\nAdd valid JSON-LD on the homepage and fix any malformed structured data blocks.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working."
      },
      {
        "checkId": "whp-average-load",
        "label": "Average page load speed",
        "prompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Average page load speed**\nCategory: Web Health → performance\nScore impact: +8 points | Effort: medium | Urgency: 3/5\n\n## Audit Finding\nAverage page load time was 3040ms across 10 pages.\n\n## Current State\nAverage page load time was 3040ms across 10 pages.\n\n## Required End State\nAverage crawl load time under 3 seconds\n\n## Technical Context\nIf your average page load time across the site is high, AI crawlers may deprioritize your content. Identify the slowest page templates and optimize them. Common culprits: unoptimized images, heavy JavaScript bundles, slow database queries on dynamic pages.\n\n## Implementation Instructions\nSpeed up slow templates and reduce bulky assets across important pages.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working."
      },
      {
        "checkId": "sd-faq",
        "label": "FAQ schema markup",
        "prompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**FAQ schema markup**\nCategory: AI Visibility → structured-data\nScore impact: +4 points | Effort: medium | Urgency: 3/5\n\n## Audit Finding\nNo FAQ schema found. FAQ markup helps AI models generate answers about your business.\n\n## Current State\nNo FAQ schema found. FAQ markup helps AI models generate answers about your business.\n\n## Required End State\nA valid FAQPage schema describing real customer questions\n\n## Technical Context\nFAQPage schema helps AI models answer questions about your business directly. Format:\n- `@type`: \"FAQPage\"\n- `mainEntity`: Array of Question objects, each with `name` (the question) and `acceptedAnswer.text` (the answer)\n- Use real questions your customers ask — check your support tickets, Google Search Console queries, or sales calls\n- Place the JSON-LD in the `<head>` of the page where the FAQ content lives\n\n## Implementation Instructions\nCreate FAQ structured data for common questions about your business.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working."
      },
      {
        "checkId": "sd-validation",
        "label": "Schema validity",
        "prompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Schema validity**\nCategory: AI Visibility → structured-data\nScore impact: +3 points | Effort: quick | Urgency: 2/5\n\n## Audit Finding\nDetected 3 malformed JSON-LD block(s).\n\n## Current State\nDetected 3 malformed JSON-LD block(s).\n\n## Required End State\nSchema blocks parse without JSON errors\n\n## Technical Context\nJSON-LD syntax errors make the entire schema block invisible to AI models. Common issues:\n- Trailing commas in JSON objects/arrays\n- Unescaped special characters in strings\n- Missing closing braces or brackets\n- Invalid `@type` values\nTest with Google's Rich Results Test or the Schema.org validator.\n\n## Implementation Instructions\nFix JSON-LD syntax errors in your schema markup.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working."
      }
    ]
  },
  "fixes": [
    {
      "checkId": "whp-homepage-load",
      "label": "Homepage response speed",
      "detail": "Homepage loaded in 7095ms during crawl.",
      "dimension": "performance",
      "category": "web",
      "pointsAvailable": 12,
      "estimatedLift": 12,
      "urgency": 4,
      "effort": 3,
      "effortBand": "medium",
      "roi": 16,
      "instruction": "Improve homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.",
      "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Homepage response speed**\nCategory: Web Health → performance\nScore impact: +12 points | Effort: medium | Urgency: 4/5\n\n## Audit Finding\nHomepage loaded in 7095ms during crawl.\n\n## Current State\nHomepage loaded in 7095ms during crawl.\n\n## Required End State\nHomepage load time under 2.5 seconds\n\n## Technical Context\nHomepage load time directly affects whether AI crawlers can efficiently index your site. Slow pages may time out during crawling. Focus on:\n- Reducing server response time (TTFB under 600ms)\n- Compressing HTML/CSS/JS with gzip or brotli\n- Lazy-loading below-the-fold images\n- Minimizing third-party script impact\n\n## Implementation Instructions\nImprove homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
      "actualValue": "Homepage loaded in 7095ms during crawl.",
      "expectedValue": "Homepage load time under 2.5 seconds"
    },
    {
      "checkId": "sd-org-schema",
      "label": "Organization schema markup",
      "detail": "No Organization schema found. Add JSON-LD markup to help AI understand your business.",
      "dimension": "structured-data",
      "category": "ai",
      "pointsAvailable": 8,
      "estimatedLift": 8,
      "urgency": 5,
      "effort": 3,
      "effortBand": "medium",
      "roi": 13.333333333333334,
      "instruction": "Add Organization or LocalBusiness JSON-LD schema to your homepage.",
      "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Organization schema markup**\nCategory: AI Visibility → structured-data\nScore impact: +8 points | Effort: medium | Urgency: 5/5\n\n## Audit Finding\nNo Organization schema found. Add JSON-LD markup to help AI understand your business.\n\n## Current State\nNo Organization schema found. Add JSON-LD markup to help AI understand your business.\n\n## Required End State\nA valid Organization or LocalBusiness JSON-LD block on the homepage\n\n## Technical Context\nOrganization JSON-LD schema goes in a `<script type=\"application/ld+json\">` block in the `<head>` of your homepage. Required fields:\n- `@context`: \"https://schema.org\"\n- `@type`: \"Organization\" (or \"LocalBusiness\" for local businesses)\n- `name`: Your official business name\n- `url`: Your canonical homepage URL\n- `description`: What your business does\n- `logo`: URL to your logo image\n- `sameAs`: Array of social profile URLs\n\nThis is the single most important structured data for AI — it tells models definitively who you are.\n\n## Implementation Instructions\nAdd Organization or LocalBusiness JSON-LD schema to your homepage.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
      "actualValue": "No Organization schema found. Add JSON-LD markup to help AI understand your business.",
      "expectedValue": "A valid Organization or LocalBusiness JSON-LD block on the homepage"
    },
    {
      "checkId": "whq-schema-detail",
      "label": "Structured data is parseable",
      "detail": "Detected 1 malformed JSON-LD block(s).",
      "dimension": "quality",
      "category": "web",
      "pointsAvailable": 6,
      "estimatedLift": 6,
      "urgency": 3,
      "effort": 2,
      "effortBand": "quick",
      "roi": 9,
      "instruction": "Add valid JSON-LD on the homepage and fix any malformed structured data blocks.",
      "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Structured data is parseable**\nCategory: Web Health → quality\nScore impact: +6 points | Effort: quick | Urgency: 3/5\n\n## Audit Finding\nDetected 1 malformed JSON-LD block(s).\n\n## Current State\nDetected 1 malformed JSON-LD block(s).\n\n## Required End State\nValid structured data with no parse failures\n\n## Technical Context\nInvalid or malformed JSON-LD structured data is worse than no structured data — it can confuse AI models. Validate all `<script type=\"application/ld+json\">` blocks:\n- Ensure valid JSON (no trailing commas, proper quoting)\n- Use correct Schema.org types and properties\n- Test at https://validator.schema.org/\n\n## Implementation Instructions\nAdd valid JSON-LD on the homepage and fix any malformed structured data blocks.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
      "actualValue": "Detected 1 malformed JSON-LD block(s).",
      "expectedValue": "Valid structured data with no parse failures"
    },
    {
      "checkId": "whp-average-load",
      "label": "Average page load speed",
      "detail": "Average page load time was 3040ms across 10 pages.",
      "dimension": "performance",
      "category": "web",
      "pointsAvailable": 8,
      "estimatedLift": 8,
      "urgency": 3,
      "effort": 3,
      "effortBand": "medium",
      "roi": 8,
      "instruction": "Speed up slow templates and reduce bulky assets across important pages.",
      "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Average page load speed**\nCategory: Web Health → performance\nScore impact: +8 points | Effort: medium | Urgency: 3/5\n\n## Audit Finding\nAverage page load time was 3040ms across 10 pages.\n\n## Current State\nAverage page load time was 3040ms across 10 pages.\n\n## Required End State\nAverage crawl load time under 3 seconds\n\n## Technical Context\nIf your average page load time across the site is high, AI crawlers may deprioritize your content. Identify the slowest page templates and optimize them. Common culprits: unoptimized images, heavy JavaScript bundles, slow database queries on dynamic pages.\n\n## Implementation Instructions\nSpeed up slow templates and reduce bulky assets across important pages.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
      "actualValue": "Average page load time was 3040ms across 10 pages.",
      "expectedValue": "Average crawl load time under 3 seconds"
    },
    {
      "checkId": "sd-faq",
      "label": "FAQ schema markup",
      "detail": "No FAQ schema found. FAQ markup helps AI models generate answers about your business.",
      "dimension": "structured-data",
      "category": "ai",
      "pointsAvailable": 4,
      "estimatedLift": 4,
      "urgency": 3,
      "effort": 3,
      "effortBand": "medium",
      "roi": 4,
      "instruction": "Create FAQ structured data for common questions about your business.",
      "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**FAQ schema markup**\nCategory: AI Visibility → structured-data\nScore impact: +4 points | Effort: medium | Urgency: 3/5\n\n## Audit Finding\nNo FAQ schema found. FAQ markup helps AI models generate answers about your business.\n\n## Current State\nNo FAQ schema found. FAQ markup helps AI models generate answers about your business.\n\n## Required End State\nA valid FAQPage schema describing real customer questions\n\n## Technical Context\nFAQPage schema helps AI models answer questions about your business directly. Format:\n- `@type`: \"FAQPage\"\n- `mainEntity`: Array of Question objects, each with `name` (the question) and `acceptedAnswer.text` (the answer)\n- Use real questions your customers ask — check your support tickets, Google Search Console queries, or sales calls\n- Place the JSON-LD in the `<head>` of the page where the FAQ content lives\n\n## Implementation Instructions\nCreate FAQ structured data for common questions about your business.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
      "actualValue": "No FAQ schema found. FAQ markup helps AI models generate answers about your business.",
      "expectedValue": "A valid FAQPage schema describing real customer questions"
    },
    {
      "checkId": "sd-validation",
      "label": "Schema validity",
      "detail": "Detected 3 malformed JSON-LD block(s).",
      "dimension": "structured-data",
      "category": "ai",
      "pointsAvailable": 3,
      "estimatedLift": 3,
      "urgency": 2,
      "effort": 2,
      "effortBand": "quick",
      "roi": 3,
      "instruction": "Fix JSON-LD syntax errors in your schema markup.",
      "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Schema validity**\nCategory: AI Visibility → structured-data\nScore impact: +3 points | Effort: quick | Urgency: 2/5\n\n## Audit Finding\nDetected 3 malformed JSON-LD block(s).\n\n## Current State\nDetected 3 malformed JSON-LD block(s).\n\n## Required End State\nSchema blocks parse without JSON errors\n\n## Technical Context\nJSON-LD syntax errors make the entire schema block invisible to AI models. Common issues:\n- Trailing commas in JSON objects/arrays\n- Unescaped special characters in strings\n- Missing closing braces or brackets\n- Invalid `@type` values\nTest with Google's Rich Results Test or the Schema.org validator.\n\n## Implementation Instructions\nFix JSON-LD syntax errors in your schema markup.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
      "actualValue": "Detected 3 malformed JSON-LD block(s).",
      "expectedValue": "Schema blocks parse without JSON errors"
    }
  ],
  "webHealth": {
    "status": "complete",
    "percentage": 69,
    "pillars": [
      {
        "key": "performance",
        "label": "Performance",
        "score": 4,
        "maxScore": 24,
        "percentage": 17,
        "status": "complete",
        "checks": [
          {
            "id": "whp-homepage-load",
            "pillar": "performance",
            "label": "Homepage response speed",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 12,
            "detail": "Homepage loaded in 7095ms during crawl.",
            "category": "web"
          },
          {
            "id": "whp-average-load",
            "pillar": "performance",
            "label": "Average page load speed",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 8,
            "detail": "Average page load time was 3040ms across 10 pages.",
            "category": "web"
          },
          {
            "id": "whp-render-mode",
            "pillar": "performance",
            "label": "Server-readable rendering",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "The homepage returns meaningful content without relying entirely on client-side rendering.",
            "category": "web"
          }
        ]
      },
      {
        "key": "quality",
        "label": "Website Quality",
        "score": 57,
        "maxScore": 63,
        "percentage": 90,
        "status": "complete",
        "checks": [
          {
            "id": "whq-title",
            "pillar": "quality",
            "label": "Title tag length",
            "verdict": "pass",
            "points": 10,
            "maxPoints": 10,
            "detail": "Homepage title is 54 characters long.",
            "category": "web"
          },
          {
            "id": "whq-meta-description",
            "pillar": "quality",
            "label": "Meta description length",
            "verdict": "pass",
            "points": 8,
            "maxPoints": 8,
            "detail": "Homepage meta description is 149 characters long.",
            "category": "web"
          },
          {
            "id": "whq-favicon",
            "pillar": "quality",
            "label": "Favicon present",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "A favicon link was found in the homepage head.",
            "category": "web"
          },
          {
            "id": "whq-viewport",
            "pillar": "quality",
            "label": "Viewport meta configured",
            "verdict": "pass",
            "points": 5,
            "maxPoints": 5,
            "detail": "Viewport is set to \"width=device-width, initial-scale=1, viewport-fit=cover\".",
            "category": "web"
          },
          {
            "id": "whq-headings",
            "pillar": "quality",
            "label": "Heading hierarchy",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Heading structure looks sound across 48 headings.",
            "category": "web"
          },
          {
            "id": "whq-canonical",
            "pillar": "quality",
            "label": "Canonical URL",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Canonical URL points to https://stripe.com/.",
            "category": "web"
          },
          {
            "id": "whq-lang",
            "pillar": "quality",
            "label": "HTML lang attribute",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "HTML lang is set to en-US.",
            "category": "web"
          },
          {
            "id": "whq-charset",
            "pillar": "quality",
            "label": "Character encoding",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "Character encoding is utf-8.",
            "category": "web"
          },
          {
            "id": "whq-open-graph",
            "pillar": "quality",
            "label": "Open Graph coverage",
            "verdict": "pass",
            "points": 9,
            "maxPoints": 9,
            "detail": "All core Open Graph tags were found.",
            "category": "web"
          },
          {
            "id": "whq-twitter",
            "pillar": "quality",
            "label": "Twitter card coverage",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "All core Twitter card tags were found.",
            "category": "web"
          },
          {
            "id": "whq-schema-detail",
            "pillar": "quality",
            "label": "Structured data is parseable",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 6,
            "detail": "Detected 1 malformed JSON-LD block(s).",
            "category": "web"
          }
        ]
      },
      {
        "key": "security",
        "label": "Trust & Security",
        "score": 30,
        "maxScore": 30,
        "percentage": 100,
        "status": "complete",
        "checks": [
          {
            "id": "whs-https",
            "pillar": "security",
            "label": "HTTPS enabled",
            "verdict": "pass",
            "points": 10,
            "maxPoints": 10,
            "detail": "The root URL resolved over HTTPS (https://stripe.com/).",
            "category": "web"
          },
          {
            "id": "whs-hsts",
            "pillar": "security",
            "label": "Strict-Transport-Security",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "HSTS header is present: max-age=63072000; includeSubDomains; preload.",
            "category": "web"
          },
          {
            "id": "whs-csp",
            "pillar": "security",
            "label": "Content-Security-Policy",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Content-Security-Policy header is present.",
            "category": "web"
          },
          {
            "id": "whs-xfo",
            "pillar": "security",
            "label": "X-Frame-Options",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "X-Frame-Options is SAMEORIGIN.",
            "category": "web"
          },
          {
            "id": "whs-nosniff",
            "pillar": "security",
            "label": "X-Content-Type-Options",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "X-Content-Type-Options is nosniff.",
            "category": "web"
          }
        ]
      }
    ],
    "metrics": [
      {
        "key": "render-mode",
        "label": "Render mode",
        "value": null,
        "displayValue": "Server rendered",
        "status": "ok",
        "detail": "The homepage returns meaningful content without relying entirely on client-side rendering."
      },
      {
        "key": "homepage-load",
        "label": "Homepage load",
        "value": 7095,
        "displayValue": "7095ms",
        "status": "warn",
        "detail": "Observed during the crawl session."
      },
      {
        "key": "schema-blocks",
        "label": "Schema blocks",
        "value": 0,
        "displayValue": "0",
        "status": "warn",
        "detail": "1 malformed JSON-LD block(s) were skipped."
      },
      {
        "key": "title-length",
        "label": "Title length",
        "value": 54,
        "displayValue": "54 chars",
        "status": "ok",
        "detail": "Ideal title length is roughly 30 to 60 characters."
      }
    ],
    "updatedAt": 1773638211561,
    "source": "heuristic"
  },
  "score": {
    "total": 80,
    "maxTotal": 95,
    "percentage": 84,
    "band": "ai-ready",
    "bandInfo": {
      "band": "ai-ready",
      "label": "AI Ready",
      "color": "#25c972",
      "min": 80,
      "max": 100
    },
    "overallBandInfo": {
      "band": "needs-work",
      "label": "Needs Work",
      "color": "#ff8a1e",
      "min": 60,
      "max": 79
    },
    "scores": {
      "aiVisibility": 84,
      "webHealth": 69,
      "overall": 78,
      "potentialLift": 22
    },
    "dimensions": [
      {
        "key": "file-presence",
        "label": "File Presence",
        "score": 20,
        "maxScore": 20,
        "percentage": 100,
        "checks": [
          {
            "id": "fp-llms-txt",
            "dimension": "file-presence",
            "category": "ai",
            "label": "llms.txt file exists",
            "verdict": "pass",
            "points": 8,
            "maxPoints": 8,
            "detail": "Your site has an llms.txt file that helps AI models understand your content."
          },
          {
            "id": "fp-robots-txt",
            "dimension": "file-presence",
            "category": "ai",
            "label": "robots.txt exists",
            "verdict": "pass",
            "points": 5,
            "maxPoints": 5,
            "detail": "robots.txt is present and accessible."
          },
          {
            "id": "fp-sitemap",
            "dimension": "file-presence",
            "category": "ai",
            "label": "sitemap.xml exists",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "Sitemap found with 793 URLs via xml."
          },
          {
            "id": "fp-sitemap-in-robots",
            "dimension": "file-presence",
            "category": "ai",
            "label": "Sitemap referenced in robots.txt",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "Sitemap is properly referenced in robots.txt."
          }
        ]
      },
      {
        "key": "structured-data",
        "label": "Structured Data",
        "score": 0,
        "maxScore": 15,
        "percentage": 0,
        "checks": [
          {
            "id": "sd-org-schema",
            "dimension": "structured-data",
            "category": "ai",
            "label": "Organization schema markup",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 8,
            "detail": "No Organization schema found. Add JSON-LD markup to help AI understand your business."
          },
          {
            "id": "sd-completeness",
            "dimension": "structured-data",
            "category": "ai",
            "label": "Schema completeness",
            "verdict": "unknown",
            "points": 0,
            "maxPoints": 5,
            "detail": "Cannot check — no Organization schema present."
          },
          {
            "id": "sd-faq",
            "dimension": "structured-data",
            "category": "ai",
            "label": "FAQ schema markup",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 4,
            "detail": "No FAQ schema found. FAQ markup helps AI models generate answers about your business."
          },
          {
            "id": "sd-validation",
            "dimension": "structured-data",
            "category": "ai",
            "label": "Schema validity",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 3,
            "detail": "Detected 3 malformed JSON-LD block(s)."
          }
        ]
      },
      {
        "key": "content-signals",
        "label": "Content Signals",
        "score": 20,
        "maxScore": 20,
        "percentage": 100,
        "checks": [
          {
            "id": "cs-about",
            "dimension": "content-signals",
            "category": "ai",
            "label": "About page exists",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "About page found — helps AI models understand your identity."
          },
          {
            "id": "cs-service-depth",
            "dimension": "content-signals",
            "category": "ai",
            "label": "Service/product page depth",
            "verdict": "pass",
            "points": 5,
            "maxPoints": 5,
            "detail": "5 detailed service pages found."
          },
          {
            "id": "cs-freshness",
            "dimension": "content-signals",
            "category": "ai",
            "label": "Content freshness signals",
            "verdict": "pass",
            "points": 5,
            "maxPoints": 5,
            "detail": "Recent date references found — signals active content."
          },
          {
            "id": "cs-contact",
            "dimension": "content-signals",
            "category": "ai",
            "label": "Contact information available",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "Contact page found — establishes legitimacy."
          }
        ]
      },
      {
        "key": "topical-authority",
        "label": "Topical Authority",
        "score": 20,
        "maxScore": 20,
        "percentage": 100,
        "checks": [
          {
            "id": "ta-focus",
            "dimension": "topical-authority",
            "category": "ai",
            "label": "Topical focus consistency",
            "verdict": "pass",
            "points": 7,
            "maxPoints": 7,
            "detail": "Strong topical focus detected around: stripe, pricing, solutions, policy, service."
          },
          {
            "id": "ta-keywords",
            "dimension": "topical-authority",
            "category": "ai",
            "label": "Keyword signals",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Meta keywords or rich descriptions found."
          },
          {
            "id": "ta-linking",
            "dimension": "topical-authority",
            "category": "ai",
            "label": "Internal linking structure",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "Good internal linking (avg 137.3 links per page)."
          },
          {
            "id": "ta-depth",
            "dimension": "topical-authority",
            "category": "ai",
            "label": "Content depth",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "Good content depth (avg 2082 words per page)."
          }
        ]
      },
      {
        "key": "entity-clarity",
        "label": "Entity Clarity",
        "score": 10,
        "maxScore": 10,
        "percentage": 100,
        "checks": [
          {
            "id": "ec-name",
            "dimension": "entity-clarity",
            "category": "ai",
            "label": "Name consistency across pages",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "\"Stripe\" appears consistently across 10 pages."
          },
          {
            "id": "ec-social",
            "dimension": "entity-clarity",
            "category": "ai",
            "label": "Social media presence linked",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "38 social media links found."
          },
          {
            "id": "ec-authority",
            "dimension": "entity-clarity",
            "category": "ai",
            "label": "Authority signals",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "Strong entity authority signals detected."
          }
        ]
      },
      {
        "key": "ai-registration",
        "label": "AI Registration",
        "score": 10,
        "maxScore": 10,
        "percentage": 100,
        "checks": [
          {
            "id": "ar-gptbot",
            "dimension": "ai-registration",
            "category": "ai",
            "label": "GPTBot access allowed",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "GPTBot is allowed to crawl your site."
          },
          {
            "id": "ar-perplexity",
            "dimension": "ai-registration",
            "category": "ai",
            "label": "PerplexityBot access allowed",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "PerplexityBot is allowed to crawl your site."
          },
          {
            "id": "ar-claude",
            "dimension": "ai-registration",
            "category": "ai",
            "label": "Claude/Anthropic bot access",
            "verdict": "pass",
            "points": 2,
            "maxPoints": 2,
            "detail": "Anthropic/Claude bots are allowed."
          },
          {
            "id": "ar-llms-refs",
            "dimension": "ai-registration",
            "category": "ai",
            "label": "llms.txt has reference links",
            "verdict": "pass",
            "points": 2,
            "maxPoints": 2,
            "detail": "llms.txt contains 268 reference links."
          }
        ]
      }
    ],
    "fixes": [
      {
        "checkId": "whp-homepage-load",
        "label": "Homepage response speed",
        "detail": "Homepage loaded in 7095ms during crawl.",
        "dimension": "performance",
        "category": "web",
        "pointsAvailable": 12,
        "estimatedLift": 12,
        "urgency": 4,
        "effort": 3,
        "effortBand": "medium",
        "roi": 16,
        "instruction": "Improve homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.",
        "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Homepage response speed**\nCategory: Web Health → performance\nScore impact: +12 points | Effort: medium | Urgency: 4/5\n\n## Audit Finding\nHomepage loaded in 7095ms during crawl.\n\n## Current State\nHomepage loaded in 7095ms during crawl.\n\n## Required End State\nHomepage load time under 2.5 seconds\n\n## Technical Context\nHomepage load time directly affects whether AI crawlers can efficiently index your site. Slow pages may time out during crawling. Focus on:\n- Reducing server response time (TTFB under 600ms)\n- Compressing HTML/CSS/JS with gzip or brotli\n- Lazy-loading below-the-fold images\n- Minimizing third-party script impact\n\n## Implementation Instructions\nImprove homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
        "actualValue": "Homepage loaded in 7095ms during crawl.",
        "expectedValue": "Homepage load time under 2.5 seconds"
      },
      {
        "checkId": "sd-org-schema",
        "label": "Organization schema markup",
        "detail": "No Organization schema found. Add JSON-LD markup to help AI understand your business.",
        "dimension": "structured-data",
        "category": "ai",
        "pointsAvailable": 8,
        "estimatedLift": 8,
        "urgency": 5,
        "effort": 3,
        "effortBand": "medium",
        "roi": 13.333333333333334,
        "instruction": "Add Organization or LocalBusiness JSON-LD schema to your homepage.",
        "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Organization schema markup**\nCategory: AI Visibility → structured-data\nScore impact: +8 points | Effort: medium | Urgency: 5/5\n\n## Audit Finding\nNo Organization schema found. Add JSON-LD markup to help AI understand your business.\n\n## Current State\nNo Organization schema found. Add JSON-LD markup to help AI understand your business.\n\n## Required End State\nA valid Organization or LocalBusiness JSON-LD block on the homepage\n\n## Technical Context\nOrganization JSON-LD schema goes in a `<script type=\"application/ld+json\">` block in the `<head>` of your homepage. Required fields:\n- `@context`: \"https://schema.org\"\n- `@type`: \"Organization\" (or \"LocalBusiness\" for local businesses)\n- `name`: Your official business name\n- `url`: Your canonical homepage URL\n- `description`: What your business does\n- `logo`: URL to your logo image\n- `sameAs`: Array of social profile URLs\n\nThis is the single most important structured data for AI — it tells models definitively who you are.\n\n## Implementation Instructions\nAdd Organization or LocalBusiness JSON-LD schema to your homepage.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
        "actualValue": "No Organization schema found. Add JSON-LD markup to help AI understand your business.",
        "expectedValue": "A valid Organization or LocalBusiness JSON-LD block on the homepage"
      },
      {
        "checkId": "whq-schema-detail",
        "label": "Structured data is parseable",
        "detail": "Detected 1 malformed JSON-LD block(s).",
        "dimension": "quality",
        "category": "web",
        "pointsAvailable": 6,
        "estimatedLift": 6,
        "urgency": 3,
        "effort": 2,
        "effortBand": "quick",
        "roi": 9,
        "instruction": "Add valid JSON-LD on the homepage and fix any malformed structured data blocks.",
        "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Structured data is parseable**\nCategory: Web Health → quality\nScore impact: +6 points | Effort: quick | Urgency: 3/5\n\n## Audit Finding\nDetected 1 malformed JSON-LD block(s).\n\n## Current State\nDetected 1 malformed JSON-LD block(s).\n\n## Required End State\nValid structured data with no parse failures\n\n## Technical Context\nInvalid or malformed JSON-LD structured data is worse than no structured data — it can confuse AI models. Validate all `<script type=\"application/ld+json\">` blocks:\n- Ensure valid JSON (no trailing commas, proper quoting)\n- Use correct Schema.org types and properties\n- Test at https://validator.schema.org/\n\n## Implementation Instructions\nAdd valid JSON-LD on the homepage and fix any malformed structured data blocks.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
        "actualValue": "Detected 1 malformed JSON-LD block(s).",
        "expectedValue": "Valid structured data with no parse failures"
      },
      {
        "checkId": "whp-average-load",
        "label": "Average page load speed",
        "detail": "Average page load time was 3040ms across 10 pages.",
        "dimension": "performance",
        "category": "web",
        "pointsAvailable": 8,
        "estimatedLift": 8,
        "urgency": 3,
        "effort": 3,
        "effortBand": "medium",
        "roi": 8,
        "instruction": "Speed up slow templates and reduce bulky assets across important pages.",
        "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Average page load speed**\nCategory: Web Health → performance\nScore impact: +8 points | Effort: medium | Urgency: 3/5\n\n## Audit Finding\nAverage page load time was 3040ms across 10 pages.\n\n## Current State\nAverage page load time was 3040ms across 10 pages.\n\n## Required End State\nAverage crawl load time under 3 seconds\n\n## Technical Context\nIf your average page load time across the site is high, AI crawlers may deprioritize your content. Identify the slowest page templates and optimize them. Common culprits: unoptimized images, heavy JavaScript bundles, slow database queries on dynamic pages.\n\n## Implementation Instructions\nSpeed up slow templates and reduce bulky assets across important pages.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
        "actualValue": "Average page load time was 3040ms across 10 pages.",
        "expectedValue": "Average crawl load time under 3 seconds"
      },
      {
        "checkId": "sd-faq",
        "label": "FAQ schema markup",
        "detail": "No FAQ schema found. FAQ markup helps AI models generate answers about your business.",
        "dimension": "structured-data",
        "category": "ai",
        "pointsAvailable": 4,
        "estimatedLift": 4,
        "urgency": 3,
        "effort": 3,
        "effortBand": "medium",
        "roi": 4,
        "instruction": "Create FAQ structured data for common questions about your business.",
        "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**FAQ schema markup**\nCategory: AI Visibility → structured-data\nScore impact: +4 points | Effort: medium | Urgency: 3/5\n\n## Audit Finding\nNo FAQ schema found. FAQ markup helps AI models generate answers about your business.\n\n## Current State\nNo FAQ schema found. FAQ markup helps AI models generate answers about your business.\n\n## Required End State\nA valid FAQPage schema describing real customer questions\n\n## Technical Context\nFAQPage schema helps AI models answer questions about your business directly. Format:\n- `@type`: \"FAQPage\"\n- `mainEntity`: Array of Question objects, each with `name` (the question) and `acceptedAnswer.text` (the answer)\n- Use real questions your customers ask — check your support tickets, Google Search Console queries, or sales calls\n- Place the JSON-LD in the `<head>` of the page where the FAQ content lives\n\n## Implementation Instructions\nCreate FAQ structured data for common questions about your business.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
        "actualValue": "No FAQ schema found. FAQ markup helps AI models generate answers about your business.",
        "expectedValue": "A valid FAQPage schema describing real customer questions"
      },
      {
        "checkId": "sd-validation",
        "label": "Schema validity",
        "detail": "Detected 3 malformed JSON-LD block(s).",
        "dimension": "structured-data",
        "category": "ai",
        "pointsAvailable": 3,
        "estimatedLift": 3,
        "urgency": 2,
        "effort": 2,
        "effortBand": "quick",
        "roi": 3,
        "instruction": "Fix JSON-LD syntax errors in your schema markup.",
        "copyPrompt": "You are a senior web developer. Implement the following fix for https://stripe.com.\n\n## Problem\n**Schema validity**\nCategory: AI Visibility → structured-data\nScore impact: +3 points | Effort: quick | Urgency: 2/5\n\n## Audit Finding\nDetected 3 malformed JSON-LD block(s).\n\n## Current State\nDetected 3 malformed JSON-LD block(s).\n\n## Required End State\nSchema blocks parse without JSON errors\n\n## Technical Context\nJSON-LD syntax errors make the entire schema block invisible to AI models. Common issues:\n- Trailing commas in JSON objects/arrays\n- Unescaped special characters in strings\n- Missing closing braces or brackets\n- Invalid `@type` values\nTest with Google's Rich Results Test or the Schema.org validator.\n\n## Implementation Instructions\nFix JSON-LD syntax errors in your schema markup.\n\n## What to Return\nProvide the **complete, production-ready implementation** — not a summary or outline:\n\n1. **Full file contents or code snippet** in a fenced code block with the correct language tag. If this is a new file (like `llms.txt` or `robots.txt`), provide the entire file. If it's a modification, show the exact lines to add or change with enough surrounding context to locate the insertion point.\n2. **File path** — where this file or change belongs (e.g., `public/robots.txt`, `<head>` of the homepage template, a server config file).\n3. **Platform instructions** — if you need to know the tech stack to give exact file paths, provide instructions for the two most common setups (e.g., WordPress + static HTML, or Next.js + plain HTML).\n4. **Verification step** — the exact URL to open or command to run after deploying to confirm the fix is working.",
        "actualValue": "Detected 3 malformed JSON-LD block(s).",
        "expectedValue": "Schema blocks parse without JSON errors"
      }
    ],
    "webHealth": {
      "status": "complete",
      "percentage": 69,
      "pillars": [
        {
          "key": "performance",
          "label": "Performance",
          "score": 4,
          "maxScore": 24,
          "percentage": 17,
          "status": "complete",
          "checks": [
            {
              "id": "whp-homepage-load",
              "pillar": "performance",
              "label": "Homepage response speed",
              "verdict": "fail",
              "points": 0,
              "maxPoints": 12,
              "detail": "Homepage loaded in 7095ms during crawl.",
              "category": "web"
            },
            {
              "id": "whp-average-load",
              "pillar": "performance",
              "label": "Average page load speed",
              "verdict": "fail",
              "points": 0,
              "maxPoints": 8,
              "detail": "Average page load time was 3040ms across 10 pages.",
              "category": "web"
            },
            {
              "id": "whp-render-mode",
              "pillar": "performance",
              "label": "Server-readable rendering",
              "verdict": "pass",
              "points": 4,
              "maxPoints": 4,
              "detail": "The homepage returns meaningful content without relying entirely on client-side rendering.",
              "category": "web"
            }
          ]
        },
        {
          "key": "quality",
          "label": "Website Quality",
          "score": 57,
          "maxScore": 63,
          "percentage": 90,
          "status": "complete",
          "checks": [
            {
              "id": "whq-title",
              "pillar": "quality",
              "label": "Title tag length",
              "verdict": "pass",
              "points": 10,
              "maxPoints": 10,
              "detail": "Homepage title is 54 characters long.",
              "category": "web"
            },
            {
              "id": "whq-meta-description",
              "pillar": "quality",
              "label": "Meta description length",
              "verdict": "pass",
              "points": 8,
              "maxPoints": 8,
              "detail": "Homepage meta description is 149 characters long.",
              "category": "web"
            },
            {
              "id": "whq-favicon",
              "pillar": "quality",
              "label": "Favicon present",
              "verdict": "pass",
              "points": 3,
              "maxPoints": 3,
              "detail": "A favicon link was found in the homepage head.",
              "category": "web"
            },
            {
              "id": "whq-viewport",
              "pillar": "quality",
              "label": "Viewport meta configured",
              "verdict": "pass",
              "points": 5,
              "maxPoints": 5,
              "detail": "Viewport is set to \"width=device-width, initial-scale=1, viewport-fit=cover\".",
              "category": "web"
            },
            {
              "id": "whq-headings",
              "pillar": "quality",
              "label": "Heading hierarchy",
              "verdict": "pass",
              "points": 6,
              "maxPoints": 6,
              "detail": "Heading structure looks sound across 48 headings.",
              "category": "web"
            },
            {
              "id": "whq-canonical",
              "pillar": "quality",
              "label": "Canonical URL",
              "verdict": "pass",
              "points": 6,
              "maxPoints": 6,
              "detail": "Canonical URL points to https://stripe.com/.",
              "category": "web"
            },
            {
              "id": "whq-lang",
              "pillar": "quality",
              "label": "HTML lang attribute",
              "verdict": "pass",
              "points": 3,
              "maxPoints": 3,
              "detail": "HTML lang is set to en-US.",
              "category": "web"
            },
            {
              "id": "whq-charset",
              "pillar": "quality",
              "label": "Character encoding",
              "verdict": "pass",
              "points": 3,
              "maxPoints": 3,
              "detail": "Character encoding is utf-8.",
              "category": "web"
            },
            {
              "id": "whq-open-graph",
              "pillar": "quality",
              "label": "Open Graph coverage",
              "verdict": "pass",
              "points": 9,
              "maxPoints": 9,
              "detail": "All core Open Graph tags were found.",
              "category": "web"
            },
            {
              "id": "whq-twitter",
              "pillar": "quality",
              "label": "Twitter card coverage",
              "verdict": "pass",
              "points": 4,
              "maxPoints": 4,
              "detail": "All core Twitter card tags were found.",
              "category": "web"
            },
            {
              "id": "whq-schema-detail",
              "pillar": "quality",
              "label": "Structured data is parseable",
              "verdict": "fail",
              "points": 0,
              "maxPoints": 6,
              "detail": "Detected 1 malformed JSON-LD block(s).",
              "category": "web"
            }
          ]
        },
        {
          "key": "security",
          "label": "Trust & Security",
          "score": 30,
          "maxScore": 30,
          "percentage": 100,
          "status": "complete",
          "checks": [
            {
              "id": "whs-https",
              "pillar": "security",
              "label": "HTTPS enabled",
              "verdict": "pass",
              "points": 10,
              "maxPoints": 10,
              "detail": "The root URL resolved over HTTPS (https://stripe.com/).",
              "category": "web"
            },
            {
              "id": "whs-hsts",
              "pillar": "security",
              "label": "Strict-Transport-Security",
              "verdict": "pass",
              "points": 6,
              "maxPoints": 6,
              "detail": "HSTS header is present: max-age=63072000; includeSubDomains; preload.",
              "category": "web"
            },
            {
              "id": "whs-csp",
              "pillar": "security",
              "label": "Content-Security-Policy",
              "verdict": "pass",
              "points": 6,
              "maxPoints": 6,
              "detail": "Content-Security-Policy header is present.",
              "category": "web"
            },
            {
              "id": "whs-xfo",
              "pillar": "security",
              "label": "X-Frame-Options",
              "verdict": "pass",
              "points": 4,
              "maxPoints": 4,
              "detail": "X-Frame-Options is SAMEORIGIN.",
              "category": "web"
            },
            {
              "id": "whs-nosniff",
              "pillar": "security",
              "label": "X-Content-Type-Options",
              "verdict": "pass",
              "points": 4,
              "maxPoints": 4,
              "detail": "X-Content-Type-Options is nosniff.",
              "category": "web"
            }
          ]
        }
      ],
      "metrics": [
        {
          "key": "render-mode",
          "label": "Render mode",
          "value": null,
          "displayValue": "Server rendered",
          "status": "ok",
          "detail": "The homepage returns meaningful content without relying entirely on client-side rendering."
        },
        {
          "key": "homepage-load",
          "label": "Homepage load",
          "value": 7095,
          "displayValue": "7095ms",
          "status": "warn",
          "detail": "Observed during the crawl session."
        },
        {
          "key": "schema-blocks",
          "label": "Schema blocks",
          "value": 0,
          "displayValue": "0",
          "status": "warn",
          "detail": "1 malformed JSON-LD block(s) were skipped."
        },
        {
          "key": "title-length",
          "label": "Title length",
          "value": 54,
          "displayValue": "54 chars",
          "status": "ok",
          "detail": "Ideal title length is roughly 30 to 60 characters."
        }
      ],
      "updatedAt": 1773638211561,
      "source": "heuristic"
    }
  }
};

export const analysisExampleScan = {
  "id": "example-report",
  "url": "https://stripe.com",
  "status": "complete",
  "scores": {
    "aiVisibility": 84,
    "webHealth": 69,
    "overall": 78,
    "potentialLift": 22
  },
  "webHealth": {
    "status": "complete",
    "percentage": 69,
    "pillars": [
      {
        "key": "performance",
        "label": "Performance",
        "score": 4,
        "maxScore": 24,
        "percentage": 17,
        "status": "complete",
        "checks": [
          {
            "id": "whp-homepage-load",
            "pillar": "performance",
            "label": "Homepage response speed",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 12,
            "detail": "Homepage loaded in 7095ms during crawl.",
            "category": "web"
          },
          {
            "id": "whp-average-load",
            "pillar": "performance",
            "label": "Average page load speed",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 8,
            "detail": "Average page load time was 3040ms across 10 pages.",
            "category": "web"
          },
          {
            "id": "whp-render-mode",
            "pillar": "performance",
            "label": "Server-readable rendering",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "The homepage returns meaningful content without relying entirely on client-side rendering.",
            "category": "web"
          }
        ]
      },
      {
        "key": "quality",
        "label": "Website Quality",
        "score": 57,
        "maxScore": 63,
        "percentage": 90,
        "status": "complete",
        "checks": [
          {
            "id": "whq-title",
            "pillar": "quality",
            "label": "Title tag length",
            "verdict": "pass",
            "points": 10,
            "maxPoints": 10,
            "detail": "Homepage title is 54 characters long.",
            "category": "web"
          },
          {
            "id": "whq-meta-description",
            "pillar": "quality",
            "label": "Meta description length",
            "verdict": "pass",
            "points": 8,
            "maxPoints": 8,
            "detail": "Homepage meta description is 149 characters long.",
            "category": "web"
          },
          {
            "id": "whq-favicon",
            "pillar": "quality",
            "label": "Favicon present",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "A favicon link was found in the homepage head.",
            "category": "web"
          },
          {
            "id": "whq-viewport",
            "pillar": "quality",
            "label": "Viewport meta configured",
            "verdict": "pass",
            "points": 5,
            "maxPoints": 5,
            "detail": "Viewport is set to \"width=device-width, initial-scale=1, viewport-fit=cover\".",
            "category": "web"
          },
          {
            "id": "whq-headings",
            "pillar": "quality",
            "label": "Heading hierarchy",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Heading structure looks sound across 48 headings.",
            "category": "web"
          },
          {
            "id": "whq-canonical",
            "pillar": "quality",
            "label": "Canonical URL",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Canonical URL points to https://stripe.com/.",
            "category": "web"
          },
          {
            "id": "whq-lang",
            "pillar": "quality",
            "label": "HTML lang attribute",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "HTML lang is set to en-US.",
            "category": "web"
          },
          {
            "id": "whq-charset",
            "pillar": "quality",
            "label": "Character encoding",
            "verdict": "pass",
            "points": 3,
            "maxPoints": 3,
            "detail": "Character encoding is utf-8.",
            "category": "web"
          },
          {
            "id": "whq-open-graph",
            "pillar": "quality",
            "label": "Open Graph coverage",
            "verdict": "pass",
            "points": 9,
            "maxPoints": 9,
            "detail": "All core Open Graph tags were found.",
            "category": "web"
          },
          {
            "id": "whq-twitter",
            "pillar": "quality",
            "label": "Twitter card coverage",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "All core Twitter card tags were found.",
            "category": "web"
          },
          {
            "id": "whq-schema-detail",
            "pillar": "quality",
            "label": "Structured data is parseable",
            "verdict": "fail",
            "points": 0,
            "maxPoints": 6,
            "detail": "Detected 1 malformed JSON-LD block(s).",
            "category": "web"
          }
        ]
      },
      {
        "key": "security",
        "label": "Trust & Security",
        "score": 30,
        "maxScore": 30,
        "percentage": 100,
        "status": "complete",
        "checks": [
          {
            "id": "whs-https",
            "pillar": "security",
            "label": "HTTPS enabled",
            "verdict": "pass",
            "points": 10,
            "maxPoints": 10,
            "detail": "The root URL resolved over HTTPS (https://stripe.com/).",
            "category": "web"
          },
          {
            "id": "whs-hsts",
            "pillar": "security",
            "label": "Strict-Transport-Security",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "HSTS header is present: max-age=63072000; includeSubDomains; preload.",
            "category": "web"
          },
          {
            "id": "whs-csp",
            "pillar": "security",
            "label": "Content-Security-Policy",
            "verdict": "pass",
            "points": 6,
            "maxPoints": 6,
            "detail": "Content-Security-Policy header is present.",
            "category": "web"
          },
          {
            "id": "whs-xfo",
            "pillar": "security",
            "label": "X-Frame-Options",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "X-Frame-Options is SAMEORIGIN.",
            "category": "web"
          },
          {
            "id": "whs-nosniff",
            "pillar": "security",
            "label": "X-Content-Type-Options",
            "verdict": "pass",
            "points": 4,
            "maxPoints": 4,
            "detail": "X-Content-Type-Options is nosniff.",
            "category": "web"
          }
        ]
      }
    ],
    "metrics": [
      {
        "key": "render-mode",
        "label": "Render mode",
        "value": null,
        "displayValue": "Server rendered",
        "status": "ok",
        "detail": "The homepage returns meaningful content without relying entirely on client-side rendering."
      },
      {
        "key": "homepage-load",
        "label": "Homepage load",
        "value": 7095,
        "displayValue": "7095ms",
        "status": "warn",
        "detail": "Observed during the crawl session."
      },
      {
        "key": "schema-blocks",
        "label": "Schema blocks",
        "value": 0,
        "displayValue": "0",
        "status": "warn",
        "detail": "1 malformed JSON-LD block(s) were skipped."
      },
      {
        "key": "title-length",
        "label": "Title length",
        "value": 54,
        "displayValue": "54 chars",
        "status": "ok",
        "detail": "Ideal title length is roughly 30 to 60 characters."
      }
    ],
    "updatedAt": 1773638211561,
    "source": "heuristic"
  },
  "dimensions": [
    {
      "key": "file-presence",
      "label": "File Presence",
      "score": 20,
      "maxScore": 20,
      "percentage": 100,
      "checks": [
        {
          "id": "fp-llms-txt",
          "dimension": "file-presence",
          "category": "ai",
          "label": "llms.txt file exists",
          "verdict": "pass",
          "points": 8,
          "maxPoints": 8,
          "detail": "Your site has an llms.txt file that helps AI models understand your content."
        },
        {
          "id": "fp-robots-txt",
          "dimension": "file-presence",
          "category": "ai",
          "label": "robots.txt exists",
          "verdict": "pass",
          "points": 5,
          "maxPoints": 5,
          "detail": "robots.txt is present and accessible."
        },
        {
          "id": "fp-sitemap",
          "dimension": "file-presence",
          "category": "ai",
          "label": "sitemap.xml exists",
          "verdict": "pass",
          "points": 4,
          "maxPoints": 4,
          "detail": "Sitemap found with 793 URLs via xml."
        },
        {
          "id": "fp-sitemap-in-robots",
          "dimension": "file-presence",
          "category": "ai",
          "label": "Sitemap referenced in robots.txt",
          "verdict": "pass",
          "points": 3,
          "maxPoints": 3,
          "detail": "Sitemap is properly referenced in robots.txt."
        }
      ]
    },
    {
      "key": "structured-data",
      "label": "Structured Data",
      "score": 0,
      "maxScore": 15,
      "percentage": 0,
      "checks": [
        {
          "id": "sd-org-schema",
          "dimension": "structured-data",
          "category": "ai",
          "label": "Organization schema markup",
          "verdict": "fail",
          "points": 0,
          "maxPoints": 8,
          "detail": "No Organization schema found. Add JSON-LD markup to help AI understand your business."
        },
        {
          "id": "sd-completeness",
          "dimension": "structured-data",
          "category": "ai",
          "label": "Schema completeness",
          "verdict": "unknown",
          "points": 0,
          "maxPoints": 5,
          "detail": "Cannot check — no Organization schema present."
        },
        {
          "id": "sd-faq",
          "dimension": "structured-data",
          "category": "ai",
          "label": "FAQ schema markup",
          "verdict": "fail",
          "points": 0,
          "maxPoints": 4,
          "detail": "No FAQ schema found. FAQ markup helps AI models generate answers about your business."
        },
        {
          "id": "sd-validation",
          "dimension": "structured-data",
          "category": "ai",
          "label": "Schema validity",
          "verdict": "fail",
          "points": 0,
          "maxPoints": 3,
          "detail": "Detected 3 malformed JSON-LD block(s)."
        }
      ]
    },
    {
      "key": "content-signals",
      "label": "Content Signals",
      "score": 20,
      "maxScore": 20,
      "percentage": 100,
      "checks": [
        {
          "id": "cs-about",
          "dimension": "content-signals",
          "category": "ai",
          "label": "About page exists",
          "verdict": "pass",
          "points": 6,
          "maxPoints": 6,
          "detail": "About page found — helps AI models understand your identity."
        },
        {
          "id": "cs-service-depth",
          "dimension": "content-signals",
          "category": "ai",
          "label": "Service/product page depth",
          "verdict": "pass",
          "points": 5,
          "maxPoints": 5,
          "detail": "5 detailed service pages found."
        },
        {
          "id": "cs-freshness",
          "dimension": "content-signals",
          "category": "ai",
          "label": "Content freshness signals",
          "verdict": "pass",
          "points": 5,
          "maxPoints": 5,
          "detail": "Recent date references found — signals active content."
        },
        {
          "id": "cs-contact",
          "dimension": "content-signals",
          "category": "ai",
          "label": "Contact information available",
          "verdict": "pass",
          "points": 4,
          "maxPoints": 4,
          "detail": "Contact page found — establishes legitimacy."
        }
      ]
    },
    {
      "key": "topical-authority",
      "label": "Topical Authority",
      "score": 20,
      "maxScore": 20,
      "percentage": 100,
      "checks": [
        {
          "id": "ta-focus",
          "dimension": "topical-authority",
          "category": "ai",
          "label": "Topical focus consistency",
          "verdict": "pass",
          "points": 7,
          "maxPoints": 7,
          "detail": "Strong topical focus detected around: stripe, pricing, solutions, policy, service."
        },
        {
          "id": "ta-keywords",
          "dimension": "topical-authority",
          "category": "ai",
          "label": "Keyword signals",
          "verdict": "pass",
          "points": 6,
          "maxPoints": 6,
          "detail": "Meta keywords or rich descriptions found."
        },
        {
          "id": "ta-linking",
          "dimension": "topical-authority",
          "category": "ai",
          "label": "Internal linking structure",
          "verdict": "pass",
          "points": 4,
          "maxPoints": 4,
          "detail": "Good internal linking (avg 137.3 links per page)."
        },
        {
          "id": "ta-depth",
          "dimension": "topical-authority",
          "category": "ai",
          "label": "Content depth",
          "verdict": "pass",
          "points": 3,
          "maxPoints": 3,
          "detail": "Good content depth (avg 2082 words per page)."
        }
      ]
    },
    {
      "key": "entity-clarity",
      "label": "Entity Clarity",
      "score": 10,
      "maxScore": 10,
      "percentage": 100,
      "checks": [
        {
          "id": "ec-name",
          "dimension": "entity-clarity",
          "category": "ai",
          "label": "Name consistency across pages",
          "verdict": "pass",
          "points": 4,
          "maxPoints": 4,
          "detail": "\"Stripe\" appears consistently across 10 pages."
        },
        {
          "id": "ec-social",
          "dimension": "entity-clarity",
          "category": "ai",
          "label": "Social media presence linked",
          "verdict": "pass",
          "points": 3,
          "maxPoints": 3,
          "detail": "38 social media links found."
        },
        {
          "id": "ec-authority",
          "dimension": "entity-clarity",
          "category": "ai",
          "label": "Authority signals",
          "verdict": "pass",
          "points": 3,
          "maxPoints": 3,
          "detail": "Strong entity authority signals detected."
        }
      ]
    },
    {
      "key": "ai-registration",
      "label": "AI Registration",
      "score": 10,
      "maxScore": 10,
      "percentage": 100,
      "checks": [
        {
          "id": "ar-gptbot",
          "dimension": "ai-registration",
          "category": "ai",
          "label": "GPTBot access allowed",
          "verdict": "pass",
          "points": 3,
          "maxPoints": 3,
          "detail": "GPTBot is allowed to crawl your site."
        },
        {
          "id": "ar-perplexity",
          "dimension": "ai-registration",
          "category": "ai",
          "label": "PerplexityBot access allowed",
          "verdict": "pass",
          "points": 3,
          "maxPoints": 3,
          "detail": "PerplexityBot is allowed to crawl your site."
        },
        {
          "id": "ar-claude",
          "dimension": "ai-registration",
          "category": "ai",
          "label": "Claude/Anthropic bot access",
          "verdict": "pass",
          "points": 2,
          "maxPoints": 2,
          "detail": "Anthropic/Claude bots are allowed."
        },
        {
          "id": "ar-llms-refs",
          "dimension": "ai-registration",
          "category": "ai",
          "label": "llms.txt has reference links",
          "verdict": "pass",
          "points": 2,
          "maxPoints": 2,
          "detail": "llms.txt contains 268 reference links."
        }
      ]
    }
  ],
  "enrichments": {
    "webHealth": {
      "status": "complete",
      "startedAt": 1773638181562,
      "completedAt": 1773638211562
    }
  },
  "progress": {
    "status": "complete",
    "checks": [
      {
        "label": "Crawl website",
        "status": "done"
      },
      {
        "label": "Score AI visibility",
        "status": "done"
      },
      {
        "label": "Measure web health",
        "status": "done"
      }
    ],
    "currentStep": "Complete"
  },
  "score": 84,
  "previewFixes": [
    {
      "checkId": "whp-homepage-load",
      "label": "Homepage response speed",
      "detail": "Homepage loaded in 7095ms during crawl.",
      "category": "web",
      "estimatedLift": 12
    },
    {
      "checkId": "sd-org-schema",
      "label": "Organization schema markup",
      "detail": "No Organization schema found. Add JSON-LD markup to help AI understand your business.",
      "category": "ai",
      "estimatedLift": 8
    },
    {
      "checkId": "whq-schema-detail",
      "label": "Structured data is parseable",
      "detail": "Detected 1 malformed JSON-LD block(s).",
      "category": "web",
      "estimatedLift": 6
    }
  ],
  "band": "ai-ready",
  "bandInfo": {
    "band": "ai-ready",
    "label": "AI Ready",
    "color": "#25c972",
    "min": 80,
    "max": 100
  },
  "assetPreview": {
    "faviconUrl": "https://www.google.com/s2/favicons?domain=stripe.com&sz=96",
    "ogTitle": "Stripe | Financial Infrastructure to Grow Your Revenue",
    "ogDescription": "Stripe is a financial services platform that helps all types of businesses accept payments, build flexible billing models, and manage money movement.",
    "ogImageUrl": "https://images.stripeassets.com/fzn2n1nzq965/XtX984S1GJVsVOXFC7kMu/01988281e867728dfb09aa7793a6e3b9/Stripe.jpg?q=80",
    "ogUrl": "https://stripe.com/",
    "twitterCard": "summary_large_image",
    "twitterTitle": "Stripe | Financial Infrastructure to Grow Your Revenue",
    "twitterDescription": "Stripe is a financial services platform that helps all types of businesses accept payments, build flexible billing models, and manage money movement.",
    "twitterImageUrl": "https://images.stripeassets.com/fzn2n1nzq965/XtX984S1GJVsVOXFC7kMu/01988281e867728dfb09aa7793a6e3b9/Stripe.jpg?q=80"
  },
  "hasEmail": false,
  "hasPaid": false,
  "createdAt": 1773638181562,
  "completedAt": 1773638211562,
  "estimatedRemainingSec": 0
};
