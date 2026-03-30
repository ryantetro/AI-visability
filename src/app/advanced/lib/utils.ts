import type { PrioritizedFix } from '@/types/score';
import { FILE_META, DEFAULT_META, WORKSTREAMS } from './constants';
import type { FileMeta, GeneratedFile, RecentScanData, WorkstreamMeta } from './types';
import { getDomain } from '@/lib/url-utils';

const STALE_IN_PROGRESS_SCAN_MS = 20 * 60 * 1000;

export function getFileMeta(filename: string): FileMeta {
  return FILE_META[filename] ?? DEFAULT_META;
}

export function formatGeneratedAt(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export function formatShortDate(timestamp?: number | null): string {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

export function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return 'No recent activity';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return minutes <= 1 ? '1 min ago' : `${minutes} mins ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
  return formatShortDate(timestamp);
}

export function verificationPath(baseUrl: string, filename: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  return filename === 'organization-schema.json' ? `${normalized}/` : `${normalized}/${filename}`;
}

export function normalizeDomainInput(value: string) {
  return value.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || '';
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-zinc-500';
  if (score >= 80) return 'text-[#25c972]';
  if (score >= 60) return 'text-[#ffbb00]';
  if (score >= 40) return 'text-[#ff8a1e]';
  return 'text-[#ff5252]';
}

export function getScoreColor(score: number | null) {
  if (score === null) return 'var(--color-primary)';
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function barFillColor(pct: number) {
  if (pct >= 80) return '#25c972';
  if (pct >= 60) return '#ff8a1e';
  return '#ff5252';
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function deriveWorkstream(fix: PrioritizedFix): WorkstreamMeta['key'] {
  if (fix.category === 'web') {
    if (fix.dimension === 'security' || fix.dimension === 'quality') return 'trust';
    return 'performance';
  }
  if (fix.dimension === 'file-presence') return 'crawl-discovery';
  if (fix.dimension === 'structured-data' || fix.dimension === 'entity-clarity') return 'structured-data';
  if (fix.dimension === 'ai-registration') return 'crawl-discovery';
  if (fix.dimension === 'content-signals' || fix.dimension === 'topical-authority') return 'ai-visibility';
  return 'ai-visibility';
}

export function getGroupedFixes(fixes: PrioritizedFix[]) {
  return WORKSTREAMS.map((stream) => ({
    ...stream,
    fixes: fixes.filter((fix) => deriveWorkstream(fix) === stream.key),
  })).filter((stream) => stream.fixes.length > 0);
}

export function matchFixToFile(fix: PrioritizedFix, files: GeneratedFile[]) {
  const text = `${fix.label} ${fix.detail} ${fix.instruction}`.toLowerCase();
  const target =
    text.includes('llms') ? 'llms.txt'
    : text.includes('robots') ? 'robots.txt'
    : text.includes('schema') || text.includes('json-ld') || text.includes('organization') ? 'organization-schema.json'
    : text.includes('sitemap') ? 'sitemap.xml'
    : null;
  return target ? files.find((file) => file.filename === target) ?? null : null;
}

export function getLatestScanByDomain(scans: RecentScanData[], domain: string) {
  const matching = scans
    .filter((scan) => getDomain(scan.url) === domain)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (matching.length === 0) return null;

  const preferred = matching.find((scan) => {
    const isInProgress = scan.status !== 'complete' && scan.status !== 'failed';
    if (!isInProgress) return true;
    return Date.now() - scan.createdAt <= STALE_IN_PROGRESS_SCAN_MS;
  });

  return preferred ?? matching[0] ?? null;
}

export function getLatestPaidScanByDomain(scans: RecentScanData[], domain: string) {
  return (
    scans
      .filter((scan) => scan.hasPaid && getDomain(scan.url) === domain)
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

export function buildCursorPrompt(
  file: GeneratedFile,
  domain: string,
  platform: string,
  meta: FileMeta,
  baseUrl: string
): string {
  const isSchema = file.filename === 'organization-schema.json';
  const siteUrl = baseUrl.replace(/\/$/, '');

  if (isSchema) {
    return `You are a senior web developer implementing AI visibility improvements for ${domain} (${platform}).

## Task
Add Organization JSON-LD structured data to the homepage so AI models (ChatGPT, Claude, Perplexity) can definitively identify this business.

## What to Do
Add a single \`<script type="application/ld+json">\` block inside the \`<head>\` tag of the site's homepage. Use the exact JSON below — do not modify field values.

\`\`\`json
${file.content}
\`\`\`

## Platform-Specific Instructions
- **WordPress**: Add to \`header.php\` in your theme, or use a plugin like "Insert Headers and Footers" to paste the script tag into the site-wide head.
- **Next.js / React**: Add inside the \`<Head>\` component of your root layout or homepage component. Use \`dangerouslySetInnerHTML\` or a \`<script>\` tag with \`type="application/ld+json"\`.
- **Shopify**: Go to Online Store → Themes → Edit Code → \`theme.liquid\`, paste inside the \`<head>\` block.
- **Static HTML**: Paste directly inside \`<head>\` in your \`index.html\`.
- **Webflow / Squarespace**: Use the custom code injection feature in site settings (head code).

## Why This Matters
Organization schema is the single most important structured data signal for AI models. It tells them your exact business name, what you do, your logo, and your social profiles — preventing hallucination and ensuring accurate citations.

## Verification
1. Deploy the change
2. Visit ${siteUrl}/ and view page source (Ctrl+U / Cmd+U)
3. Search for \`application/ld+json\` — the schema JSON should appear in the \`<head>\`
4. Validate at https://validator.schema.org/ by pasting the URL`;
  }

  const filePath = file.filename === 'llms.txt' ? '/llms.txt' : `/${file.filename}`;
  const fileContext = getFileDeployContext(file.filename);

  return `You are a senior web developer implementing AI visibility improvements for ${domain} (${platform}).

## Task
Create \`${filePath}\` at the site root so it is publicly accessible at \`${siteUrl}${filePath}\`.

## Purpose
${meta.purpose}

## File Content
Create the file with the exact content below. Do not modify it.

\`\`\`
${file.content}
\`\`\`

${fileContext}## Deployment
Target: ${meta.installTarget}

## Platform-Specific Instructions
- **WordPress**: Upload to the WordPress root directory (same level as \`wp-config.php\`), or use a plugin like Yoast SEO (for robots.txt/sitemap) to manage it through the admin panel.
- **Next.js / React**: Place in the \`public/\` directory as \`public${filePath}\`. It will be served at the root automatically.
- **Shopify**: For \`robots.txt\`, edit via Online Store → Themes → Edit Code → \`robots.txt.liquid\`. Other files may need a URL redirect or a custom page.
- **Static HTML / Apache**: Place the file in your document root. Ensure your server config doesn't block it.
- **Netlify / Vercel**: Place in the \`public/\` or \`static/\` directory. It will be served at the site root.

## Verification
1. Deploy the file
2. Open \`${siteUrl}${filePath}\` in a browser — the file content should display as plain text
3. Confirm the response has a 200 status code (check in browser DevTools → Network tab)`;
}

export function buildAllFilesPrompt(
  files: GeneratedFile[],
  domain: string,
  platform: string,
  baseUrl: string
): string {
  const header = `You are a senior web developer implementing AI visibility improvements for ${domain} (${platform}). Deploy the following ${files.length} files to make this site fully visible to AI models like ChatGPT, Claude, and Perplexity.\n`;

  const sections = files.map((file) => {
    const meta = getFileMeta(file.filename);
    return buildCursorPrompt(file, domain, platform, meta, baseUrl);
  });

  const verifyUrl = baseUrl.replace(/\/$/, '');
  const checklist = files
    .map((file) => {
      if (file.filename === 'organization-schema.json') {
        return `- [ ] Visit ${verifyUrl}/ and view source — confirm \`application/ld+json\` block is present`;
      }
      return `- [ ] Visit ${verifyUrl}/${file.filename} — confirm 200 status and correct content`;
    })
    .join('\n');

  return `${header}\n${sections.join('\n\n---\n\n')}\n\n---\n\n## Final Verification Checklist\n${checklist}\n\nOnce all files are deployed and verified, the site will have a complete AI visibility foundation.`;
}

function getFileDeployContext(filename: string): string {
  switch (filename) {
    case 'llms.txt':
      return `## Why This Matters
\`llms.txt\` is an emerging standard that helps AI models understand your organization at a glance. AI crawlers (GPTBot, ClaudeBot, PerplexityBot) check for this file to get a structured overview of who you are, what you do, and which pages matter most. Without it, AI models must infer this from scattered page content — which leads to less accurate citations.

`;
    case 'robots.txt':
      return `## Why This Matters
AI crawlers like GPTBot, ClaudeBot, and PerplexityBot respect robots.txt directives. Without explicit \`Allow\` rules for these user agents, your site may be partially or fully invisible to AI-powered search. This file also includes a \`Sitemap:\` directive so crawlers can discover all your content.

`;
    case 'sitemap.xml':
      return `## Why This Matters
A sitemap tells AI crawlers exactly which pages exist and when they were last updated. Without one, crawlers must discover pages by following links — which means deep or orphaned pages may never be found. AI models use sitemaps to prioritize which content to index and reference.

`;
    default:
      return '';
  }
}
