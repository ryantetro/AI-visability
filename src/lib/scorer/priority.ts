import { CheckResult, PrioritizedFix } from '@/types/score';

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
};

export function prioritizeFixes(checks: CheckResult[]): PrioritizedFix[] {
  const failedChecks = checks.filter((c) => c.verdict === 'fail');

  return failedChecks
    .map((check) => {
      const info = fixInstructions[check.id] || { urgency: 2, effort: 3, instruction: 'Review and fix this issue.' };
      const roi = (check.maxPoints * info.urgency) / info.effort;
      return {
        checkId: check.id,
        label: check.label,
        detail: check.detail,
        dimension: check.dimension,
        pointsAvailable: check.maxPoints,
        urgency: info.urgency,
        effort: info.effort,
        roi,
        instruction: info.instruction,
      };
    })
    .sort((a, b) => b.roi - a.roi);
}
