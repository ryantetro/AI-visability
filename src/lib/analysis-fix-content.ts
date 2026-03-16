export interface CheckMediaAsset {
  kind: 'image' | 'code';
  presentation?: 'preview' | 'icon';
  src?: string;
  alt?: string;
  caption?: string;
  code?: string;
  language?: string;
}

export interface CheckFixContent {
  currentValue?: string;
  recommendedValue?: string;
  whyItMatters?: string;
  implementationSteps?: string[];
  verification?: string;
  media?: CheckMediaAsset;
  ctaLabel?: string;
  ctaHref?: string;
}

const FIX_CONTENT_REGISTRY: Record<string, CheckFixContent> = {
  title: {
    currentValue: 'Current title is present but not using the strongest intent keywords at the front.',
    recommendedValue: 'Lead with the core keyword, keep the title distinctive, and stay within the ideal length range.',
    whyItMatters:
      'The title is one of the strongest signals for both search crawlers and AI systems to understand what the page is about.',
    implementationSteps: [
      'Move the primary keyword or page topic closer to the start of the title.',
      'Keep the total length inside the recommended range so the full value is visible in search results.',
      'Make sure the title remains unique for this page instead of duplicating another page title.',
    ],
    verification:
      'Inspect the page source and confirm the final <title> matches the updated wording exactly.',
  },
  'meta description': {
    currentValue: 'The description may be missing key value props, too short, or too long for clean result previews.',
    recommendedValue: 'Use one concise summary that includes the offer, supporting proof, and one strong call to action.',
    whyItMatters:
      'Meta descriptions do not directly rank the page, but they strongly affect click-through rate and reinforce what the page promises.',
    implementationSteps: [
      'Rewrite the summary to explain the benefit in one sentence.',
      'Keep the total length in the visible SERP range.',
      'Avoid repeating the title word-for-word.',
    ],
    verification:
      'Reload the page source and confirm the meta description content has updated without duplicate tags.',
  },
  headings: {
    currentValue: 'Heading order is either too flat, too repetitive, or skips hierarchy in a way that weakens page structure.',
    recommendedValue: 'Use one clear H1, then descending H2/H3 sections that group the page into scannable topic blocks.',
    whyItMatters:
      'Heading hierarchy helps search engines, accessibility tools, and AI systems infer what the main sections and priorities of the page are.',
    implementationSteps: [
      'Keep one descriptive H1 on the page.',
      'Turn major section titles into H2s and nested points into H3s where needed.',
      'Avoid using headings purely for styling.',
    ],
    verification:
      'Inspect the rendered DOM and confirm the heading order reads logically from top to bottom without skipped structure.',
  },
  'open graph coverage': {
    currentValue: 'Core Open Graph fields may be incomplete or inconsistent across title, description, image, and canonical URL.',
    recommendedValue: 'Ship a complete OG set: title, description, image, and URL for reliable previews on social and chat surfaces.',
    whyItMatters:
      'Open Graph metadata improves how links are represented when shared into social feeds, messaging apps, and AI-driven preview surfaces.',
    implementationSteps: [
      'Add or update og:title, og:description, og:image, and og:url.',
      'Use a dedicated image with the right crop ratio and strong headline contrast.',
      'Keep OG text aligned with the page title and meta description.',
    ],
    verification:
      'Open the page source and confirm all core OG tags are present once and resolve to live assets.',
    media: {
      kind: 'code',
      language: 'html',
      caption: 'Recommended Open Graph pattern',
      code: `<meta property="og:title" content="See what is hurting your SEO & AI visibility" />
<meta property="og:description" content="Run a website analysis and get a prioritized fix list." />
<meta property="og:image" content="https://example.com/og-image.png" />
<meta property="og:url" content="https://example.com" />`,
    },
  },
  'twitter card coverage': {
    currentValue: 'Twitter card tags are missing or only partially configured.',
    recommendedValue: 'Use summary_large_image with a matching title, description, and card image.',
    whyItMatters:
      'Twitter/X card tags ensure your links render with a polished preview instead of a text-only fallback.',
    implementationSteps: [
      'Set twitter:card to summary_large_image.',
      'Mirror the title and description from your strongest social metadata.',
      'Use an image that is publicly reachable and visually readable on dark and light backgrounds.',
    ],
    verification:
      'Inspect the page head and confirm the twitter tags render once with the expected image URL.',
  },
  'largest contentful paint': {
    currentValue: 'The largest visual element is rendering later than ideal for the user’s first meaningful view.',
    recommendedValue: 'Keep LCP comfortably inside the green threshold by reducing blocking work and optimizing the hero asset.',
    whyItMatters:
      'LCP is one of the clearest signals of real user loading speed and affects both UX and web quality scoring.',
    implementationSteps: [
      'Compress or resize the main above-the-fold image.',
      'Preload the primary font or hero asset only if it is truly critical.',
      'Reduce main-thread blocking JavaScript before the hero renders.',
    ],
    verification:
      'Re-run the page speed scan and confirm LCP drops into the green range on the same page template.',
  },
  'content security policy': {
    currentValue: 'The current CSP may be too permissive or missing entirely.',
    recommendedValue: 'Define a narrow policy that explicitly allows only the resources the app needs.',
    whyItMatters:
      'A good CSP reduces the blast radius of injected content and strengthens trust signals around site hardening.',
    implementationSteps: [
      'Start with default-src self and add only the trusted origins required by the app.',
      'Avoid broad wildcards when a specific host list is possible.',
      'Roll out incrementally if third-party scripts are already present.',
    ],
    verification:
      'Inspect the response headers in DevTools and confirm the CSP header is being returned on the live page.',
  },
  'domain rating': {
    currentValue: 'The domain has limited authority compared to stronger competitors in the same topic cluster.',
    recommendedValue: 'Increase high-quality references, branded mentions, and linking root domains over time.',
    whyItMatters:
      'Domain-level trust affects how likely search systems are to believe and prioritize your pages.',
    implementationSteps: [
      'Win relevant backlinks from reputable sites in your niche.',
      'Publish assets that attract citations instead of only product pages.',
      'Strengthen branded mentions, partnerships, and profile completeness.',
    ],
    verification:
      'Refresh the external domain authority source periodically and track trend movement rather than expecting overnight changes.',
  },
  'background and foreground colors do not have a sufficient contrast ratio.': {
    currentValue: 'One or more text layers do not clear the minimum contrast threshold against their background.',
    recommendedValue: 'Increase contrast so the foreground remains readable in normal viewing conditions.',
    whyItMatters:
      'Low contrast directly hurts accessibility and makes critical UI harder to parse for many users.',
    implementationSteps: [
      'Increase text brightness or darken the background behind it.',
      'Check hover and disabled states too, not just the default state.',
      'Retest all affected components at their smallest text size.',
    ],
    verification:
      'Re-run the accessibility audit and confirm the contrast failure no longer appears.',
  },
};

export function getCheckFixContent(label: string): CheckFixContent | undefined {
  return FIX_CONTENT_REGISTRY[label.trim().toLowerCase()];
}
