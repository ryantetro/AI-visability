import { buildFixPrompt } from '@/lib/llm-prompts';
import { CheckResult, PrioritizedFix, WebHealthCheckResult } from '@/types/score';

type AuditCheck = CheckResult | WebHealthCheckResult;

const fixInstructions: Record<string, { urgency: number; effort: number; instruction: string }> = {
  'fp-llms-txt': { urgency: 5, effort: 2, instruction: 'Create an llms.txt file in your site root describing your organization for AI models.' },
  'fp-robots-txt': { urgency: 4, effort: 1, instruction: 'Create or update your robots.txt to explicitly allow AI crawlers.' },
  'fp-sitemap': { urgency: 4, effort: 2, instruction: 'Generate a sitemap.xml listing all important pages.' },
  'fp-sitemap-in-robots': { urgency: 3, effort: 1, instruction: 'Add a Sitemap: directive to your robots.txt pointing to your sitemap.xml.' },
  'sd-org-schema': { urgency: 5, effort: 3, instruction: 'Add Organization or LocalBusiness JSON-LD schema to your homepage.' },
  'sd-completeness': { urgency: 3, effort: 2, instruction: 'Add missing fields (name, url, description, logo, sameAs) to your Organization schema.' },
  'sd-faq': { urgency: 3, effort: 3, instruction: 'Create FAQ structured data for common questions about your business.' },
  'sd-validation': { urgency: 2, effort: 2, instruction: 'Fix JSON-LD syntax errors in your schema markup.' },
  'cs-about': { urgency: 4, effort: 3, instruction: 'Create a detailed About page explaining who you are and what you do.' },
  'cs-service-depth': { urgency: 3, effort: 4, instruction: 'Expand service/product pages to 300+ words with detailed descriptions.' },
  'cs-freshness': { urgency: 3, effort: 2, instruction: 'Add recent dates, update copyright year, or publish fresh content.' },
  'cs-contact': { urgency: 3, effort: 2, instruction: 'Create a Contact page with your business contact information.' },
  'ta-focus': { urgency: 4, effort: 4, instruction: 'Align page titles and content around your core topics and services.' },
  'ta-keywords': { urgency: 3, effort: 2, instruction: 'Add descriptive meta descriptions and keywords to key pages.' },
  'ta-linking': { urgency: 2, effort: 3, instruction: 'Add more internal links between related pages (aim for 3+ per page).' },
  'ta-depth': { urgency: 2, effort: 4, instruction: 'Increase content length on thin pages to 300+ words.' },
  'ec-name': { urgency: 3, effort: 2, instruction: 'Use your brand name consistently across all page titles and content.' },
  'ec-social': { urgency: 2, effort: 1, instruction: 'Add links to your social media profiles in the footer or contact page.' },
  'ec-authority': { urgency: 2, effort: 2, instruction: 'Add sameAs property to your Organization schema linking to social profiles.' },
  'ar-gptbot': { urgency: 4, effort: 1, instruction: 'Add "User-agent: GPTBot\\nAllow: /" to your robots.txt.' },
  'ar-perplexity': { urgency: 3, effort: 1, instruction: 'Add "User-agent: PerplexityBot\\nAllow: /" to your robots.txt.' },
  'ar-claude': { urgency: 2, effort: 1, instruction: 'Add "User-agent: ClaudeBot\\nAllow: /" to your robots.txt.' },
  'ar-llms-refs': { urgency: 2, effort: 2, instruction: 'Add reference links to key pages in your llms.txt file.' },
  'whp-performance-score': { urgency: 4, effort: 4, instruction: 'Reduce heavy scripts, optimize assets, and improve caching until the PageSpeed performance score is above 80.' },
  'whp-lcp': { urgency: 4, effort: 3, instruction: 'Optimize your largest above-the-fold content by compressing hero media, reducing render-blocking resources, and preloading the main asset.' },
  'whp-cls': { urgency: 3, effort: 2, instruction: 'Reserve layout space for images, embeds, and late-loading UI so the page does not shift during load.' },
  'whp-tbt': { urgency: 3, effort: 3, instruction: 'Reduce main-thread JavaScript and defer non-critical scripts to lower Total Blocking Time.' },
  'whp-homepage-load': { urgency: 4, effort: 3, instruction: 'Improve homepage response speed by compressing assets, trimming third-party scripts, and caching critical resources.' },
  'whp-average-load': { urgency: 3, effort: 3, instruction: 'Speed up slow templates and reduce bulky assets across important pages.' },
  'whp-render-mode': { urgency: 4, effort: 4, instruction: 'Ensure core homepage content renders in the initial HTML so AI crawlers do not depend on JavaScript execution.' },
  'whq-title': { urgency: 4, effort: 1, instruction: 'Rewrite the homepage title tag so it is specific and roughly 30 to 60 characters.' },
  'whq-meta-description': { urgency: 3, effort: 1, instruction: 'Add or tighten the homepage meta description so it lands near 120 to 160 characters.' },
  'whq-favicon': { urgency: 1, effort: 1, instruction: 'Add a favicon link in the site head or ensure /favicon.ico is served correctly.' },
  'whq-viewport': { urgency: 3, effort: 1, instruction: 'Add a responsive viewport meta tag with width=device-width and initial-scale=1.' },
  'whq-headings': { urgency: 3, effort: 2, instruction: 'Fix heading structure so the page has a clear H1 and does not skip heading levels.' },
  'whq-canonical': { urgency: 3, effort: 1, instruction: 'Add a canonical link tag on the homepage that points to the preferred URL.' },
  'whq-lang': { urgency: 2, effort: 1, instruction: 'Set the HTML lang attribute to the correct language code.' },
  'whq-charset': { urgency: 2, effort: 1, instruction: 'Declare UTF-8 character encoding in the document head.' },
  'whq-open-graph': { urgency: 3, effort: 2, instruction: 'Add the core Open Graph tags so shared links describe the site consistently.' },
  'whq-twitter': { urgency: 2, effort: 2, instruction: 'Add the main Twitter card tags for better metadata coverage.' },
  'whq-schema-detail': { urgency: 3, effort: 2, instruction: 'Add valid JSON-LD on the homepage and fix any malformed structured data blocks.' },
  'whs-https': { urgency: 5, effort: 3, instruction: 'Redirect the site to HTTPS and serve the canonical site over TLS.' },
  'whs-hsts': { urgency: 3, effort: 2, instruction: 'Add a Strict-Transport-Security header with a meaningful max-age after HTTPS is stable.' },
  'whs-csp': { urgency: 3, effort: 3, instruction: 'Add a Content-Security-Policy header that covers your current scripts, styles, and media sources.' },
  'whs-xfo': { urgency: 2, effort: 1, instruction: 'Set X-Frame-Options to SAMEORIGIN or DENY.' },
  'whs-nosniff': { urgency: 2, effort: 1, instruction: 'Set X-Content-Type-Options to nosniff.' },
};

export function prioritizeFixes(checks: AuditCheck[], context: { url: string }): PrioritizedFix[] {
  const failedChecks = checks.filter((c) => c.verdict === 'fail');

  return failedChecks
    .map((check) => {
      const info = fixInstructions[check.id] || { urgency: 2, effort: 3, instruction: 'Review and fix this issue.' };
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
        roi,
        instruction: info.instruction,
        copyPrompt: '',
      };

      fix.copyPrompt = buildFixPrompt(context.url, fix);
      return fix;
    })
    .sort((a, b) => b.roi - a.roi);
}
