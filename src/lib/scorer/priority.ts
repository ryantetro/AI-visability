import { buildFixPrompt } from '@/lib/llm-prompts';
import { CheckResult, EffortBand, PrioritizedFix, WebHealthCheckResult } from '@/types/score';

type AuditCheck = CheckResult | WebHealthCheckResult;

const fixInstructions: Record<string, { urgency: number; effort: number; instruction: string; expectedValue?: string }> = {
  'fp-llms-txt': { urgency: 5, effort: 2, instruction: 'Create an llms.txt file in your site root describing your organization for AI models.', expectedValue: 'A public /llms.txt file with company description and key links' },
  'fp-robots-txt': { urgency: 4, effort: 1, instruction: 'Create or update your robots.txt to explicitly allow AI crawlers.', expectedValue: 'A public /robots.txt with explicit allow directives for AI crawlers' },
  'fp-sitemap': { urgency: 4, effort: 2, instruction: 'Generate a sitemap.xml listing all important pages.', expectedValue: 'A valid /sitemap.xml covering important canonical URLs' },
  'fp-sitemap-in-robots': { urgency: 3, effort: 1, instruction: 'Add a Sitemap: directive to your robots.txt pointing to your sitemap.xml.', expectedValue: 'A Sitemap directive in robots.txt pointing to the live sitemap URL' },
  'sd-org-schema': { urgency: 5, effort: 3, instruction: 'Add Organization or LocalBusiness JSON-LD schema to your homepage.', expectedValue: 'A valid Organization or LocalBusiness JSON-LD block on the homepage' },
  'sd-completeness': { urgency: 3, effort: 2, instruction: 'Add missing fields (name, url, description, logo, sameAs) to your Organization schema.', expectedValue: 'Required organization fields present in JSON-LD' },
  'sd-faq': { urgency: 3, effort: 3, instruction: 'Create FAQ structured data for common questions about your business.', expectedValue: 'A valid FAQPage schema describing real customer questions' },
  'sd-validation': { urgency: 2, effort: 2, instruction: 'Fix JSON-LD syntax errors in your schema markup.', expectedValue: 'Schema blocks parse without JSON errors' },
  'cs-about': { urgency: 4, effort: 3, instruction: 'Create a detailed About page explaining who you are and what you do.', expectedValue: 'A crawlable About page with brand, offer, and entity details' },
  'cs-service-depth': { urgency: 3, effort: 4, instruction: 'Expand service/product pages to 300+ words with detailed descriptions.', expectedValue: 'Core service pages with clear, substantial content' },
  'cs-freshness': { urgency: 3, effort: 2, instruction: 'Add recent dates, update copyright year, or publish fresh content.', expectedValue: 'Visible freshness signals from the current year' },
  'cs-contact': { urgency: 3, effort: 2, instruction: 'Create a Contact page with your business contact information.', expectedValue: 'A crawlable Contact page with business contact details' },
  'ta-focus': { urgency: 4, effort: 4, instruction: 'Align page titles and content around your core topics and services.', expectedValue: 'Titles and headings aligned with the site’s core service topics' },
  'ta-keywords': { urgency: 3, effort: 2, instruction: 'Add descriptive meta descriptions and keywords to key pages.', expectedValue: 'Meta descriptions and page copy aligned to key commercial intent topics' },
  'ta-linking': { urgency: 2, effort: 3, instruction: 'Add more internal links between related pages (aim for 3+ per page).', expectedValue: 'Consistent internal linking between related pages' },
  'ta-depth': { urgency: 2, effort: 4, instruction: 'Increase content length on thin pages to 300+ words.', expectedValue: 'Thin pages expanded with useful supporting content' },
  'ec-name': { urgency: 3, effort: 2, instruction: 'Use your brand name consistently across all page titles and content.', expectedValue: 'Brand name used consistently across titles, headings, and schema' },
  'ec-social': { urgency: 2, effort: 1, instruction: 'Add links to your social media profiles in the footer or contact page.', expectedValue: 'Public links to active brand social profiles' },
  'ec-authority': { urgency: 2, effort: 2, instruction: 'Add sameAs property to your Organization schema linking to social profiles.', expectedValue: 'sameAs URLs added to organization schema' },
  'ar-gptbot': { urgency: 4, effort: 1, instruction: 'Add "User-agent: GPTBot\\nAllow: /" to your robots.txt.', expectedValue: 'GPTBot explicitly allowed in robots.txt' },
  'ar-perplexity': { urgency: 3, effort: 1, instruction: 'Add "User-agent: PerplexityBot\\nAllow: /" to your robots.txt.', expectedValue: 'PerplexityBot explicitly allowed in robots.txt' },
  'ar-claude': { urgency: 2, effort: 1, instruction: 'Add "User-agent: ClaudeBot\\nAllow: /" to your robots.txt.', expectedValue: 'ClaudeBot explicitly allowed in robots.txt' },
  'ar-llms-refs': { urgency: 2, effort: 2, instruction: 'Add reference links to key pages in your llms.txt file.', expectedValue: 'llms.txt linking to top priority pages and sections' },
  'whp-performance-score': { urgency: 4, effort: 4, instruction: 'Reduce heavy scripts, optimize assets, and improve caching until the PageSpeed performance score is above 80.', expectedValue: 'PageSpeed performance score above 80' },
  'whp-seo-score': { urgency: 3, effort: 2, instruction: 'Resolve Lighthouse SEO findings like metadata, canonical consistency, and crawlable links until the score is above 80.', expectedValue: 'PageSpeed SEO score above 80' },
  'whp-best-practices-score': { urgency: 2, effort: 2, instruction: 'Address Lighthouse best-practice issues like deprecated APIs, unsafe embeds, and modern asset delivery.', expectedValue: 'PageSpeed best-practices score above 80' },
  'whp-accessibility-score': { urgency: 2, effort: 3, instruction: 'Resolve Lighthouse accessibility findings including contrast, labels, and semantic structure.', expectedValue: 'PageSpeed accessibility score above 80' },
  'whp-lcp': { urgency: 4, effort: 3, instruction: 'Optimize your largest above-the-fold content by compressing hero media, reducing render-blocking resources, and preloading the main asset.', expectedValue: 'LCP at or below 2.5 seconds' },
  'whp-cls': { urgency: 3, effort: 2, instruction: 'Reserve layout space for images, embeds, and late-loading UI so the page does not shift during load.', expectedValue: 'CLS at or below 0.10' },
  'whp-tbt': { urgency: 3, effort: 3, instruction: 'Reduce main-thread JavaScript and defer non-critical scripts to lower Total Blocking Time.', expectedValue: 'TBT at or below 200ms' },
  'whp-inp': { urgency: 3, effort: 3, instruction: 'Trim interaction-heavy JavaScript and optimize event handling until INP lands below 200ms.', expectedValue: 'INP at or below 200ms' },
  'whp-homepage-load': { urgency: 4, effort: 3, instruction: 'Improve homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.', expectedValue: 'Homepage load time under 2.5 seconds' },
  'whp-average-load': { urgency: 3, effort: 3, instruction: 'Speed up slow templates and reduce bulky assets across important pages.', expectedValue: 'Average crawl load time under 3 seconds' },
  'whp-render-mode': { urgency: 4, effort: 4, instruction: 'Ensure core homepage content renders in the initial HTML so AI crawlers do not depend on JavaScript execution.', expectedValue: 'Meaningful content present in the server-rendered HTML response' },
  'whq-title': { urgency: 4, effort: 1, instruction: 'Rewrite the homepage title tag so it is specific and roughly 30 to 60 characters.', expectedValue: 'Homepage title between 30 and 60 characters' },
  'whq-meta-description': { urgency: 3, effort: 1, instruction: 'Add or tighten the homepage meta description so it lands near 120 to 160 characters.', expectedValue: 'Homepage meta description between 120 and 160 characters' },
  'whq-favicon': { urgency: 1, effort: 1, instruction: 'Add a favicon link in the site head or ensure /favicon.ico is served correctly.', expectedValue: 'A valid favicon reference in the document head' },
  'whq-viewport': { urgency: 3, effort: 1, instruction: 'Add a responsive viewport meta tag with width=device-width and initial-scale=1.', expectedValue: 'Viewport meta with width=device-width, initial-scale=1' },
  'whq-headings': { urgency: 3, effort: 2, instruction: 'Fix heading structure so the page has a clear H1 and does not skip heading levels.', expectedValue: 'A clean H1-H6 hierarchy without skipped levels' },
  'whq-canonical': { urgency: 3, effort: 1, instruction: 'Add a canonical link tag on the homepage that points to the preferred URL.', expectedValue: 'A canonical URL element in the homepage head' },
  'whq-lang': { urgency: 2, effort: 1, instruction: 'Set the HTML lang attribute to the correct language code.', expectedValue: 'A valid html[lang] attribute' },
  'whq-charset': { urgency: 2, effort: 1, instruction: 'Declare UTF-8 character encoding in the document head.', expectedValue: 'A utf-8 charset declaration in the head' },
  'whq-open-graph': { urgency: 3, effort: 2, instruction: 'Add the core Open Graph tags so shared links describe the site consistently.', expectedValue: 'Complete og:title, og:description, og:image, og:url, and og:type tags' },
  'whq-twitter': { urgency: 2, effort: 2, instruction: 'Add the main Twitter card tags for better metadata coverage.', expectedValue: 'Complete twitter:card, title, description, and image tags' },
  'whq-schema-detail': { urgency: 3, effort: 2, instruction: 'Add valid JSON-LD on the homepage and fix any malformed structured data blocks.', expectedValue: 'Valid structured data with no parse failures' },
  'whs-https': { urgency: 5, effort: 3, instruction: 'Redirect the site to HTTPS and serve the canonical site over TLS.', expectedValue: 'The canonical site loads over HTTPS' },
  'whs-hsts': { urgency: 3, effort: 2, instruction: 'Add a Strict-Transport-Security header with a meaningful max-age after HTTPS is stable.', expectedValue: 'HSTS header with a positive max-age' },
  'whs-csp': { urgency: 3, effort: 3, instruction: 'Add a Content-Security-Policy header that covers your current scripts, styles, and media sources.', expectedValue: 'A valid CSP response header' },
  'whs-xfo': { urgency: 2, effort: 1, instruction: 'Set X-Frame-Options to SAMEORIGIN or DENY.', expectedValue: 'X-Frame-Options set to SAMEORIGIN or DENY' },
  'whs-nosniff': { urgency: 2, effort: 1, instruction: 'Set X-Content-Type-Options to nosniff.', expectedValue: 'X-Content-Type-Options set to nosniff' },
};

function effortBandFromValue(effort: number): EffortBand {
  if (effort <= 2) return 'quick';
  if (effort <= 3) return 'medium';
  return 'technical';
}

export function prioritizeFixes(checks: AuditCheck[], context: { url: string }): PrioritizedFix[] {
  const failedChecks = checks.filter((c) => c.verdict === 'fail');

  return failedChecks
    .map((check) => {
      const info = fixInstructions[check.id] || {
        urgency: 2,
        effort: 3,
        instruction: 'Review and fix this issue.',
        expectedValue: 'A corrected implementation that resolves the failed audit check',
      };
      const roi = (check.maxPoints * info.urgency) / info.effort;
      const fix: PrioritizedFix = {
        checkId: check.id,
        label: check.label,
        detail: check.detail,
        dimension: 'dimension' in check ? check.dimension : check.pillar,
        category: check.category,
        pointsAvailable: check.maxPoints,
        estimatedLift: check.maxPoints,
        urgency: info.urgency,
        effort: info.effort,
        effortBand: effortBandFromValue(info.effort),
        roi,
        instruction: info.instruction,
        copyPrompt: '',
        actualValue: check.detail,
        expectedValue: info.expectedValue,
      };

      fix.copyPrompt = buildFixPrompt(context.url, fix);
      return fix;
    })
    .sort((a, b) => b.roi - a.roi);
}
