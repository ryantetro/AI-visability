import { CrawlData } from '@/types/crawler';

export function generateJsonLd(data: CrawlData): string {
  const homepage = data.homepage;
  const domain = new URL(data.url).hostname;

  // Build Organization schema
  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: homepage?.title?.split(/[|\-–—]/)[0]?.trim() || domain,
    url: data.url,
    description: homepage?.metaDescription || '',
  };

  // Add logo if found in OG tags
  if (homepage?.ogTags['og:image']) {
    org.logo = homepage.ogTags['og:image'];
  }

  // Add social links
  const allExternalLinks = data.pages.flatMap((p) => p.externalLinks);
  const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'github.com'];
  const socialLinks = [...new Set(
    allExternalLinks.filter((link) => socialDomains.some((d) => link.includes(d)))
  )];
  if (socialLinks.length > 0) {
    org.sameAs = socialLinks;
  }

  // Add contact if contact page exists
  const contactPage = data.pages.find((p) => p.classification === 'contact');
  if (contactPage) {
    org.contactPoint = {
      '@type': 'ContactPoint',
      url: contactPage.url,
      contactType: 'customer service',
    };
  }

  // Build FAQ schema from FAQ page if exists
  const faqPage = data.pages.find((p) => p.classification === 'faq');
  const schemas: Record<string, unknown>[] = [org];

  if (faqPage && faqPage.h1s.length > 0) {
    // Try to extract Q&A pairs from headings
    const faq: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqPage.h1s.slice(0, 5).map((h) => ({
        '@type': 'Question',
        name: h,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Visit ${faqPage.url} for the complete answer.`,
        },
      })),
    };
    schemas.push(faq);
  }

  return JSON.stringify(schemas.length === 1 ? schemas[0] : schemas, null, 2);
}
