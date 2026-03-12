import { CrawlData } from '@/types/crawler';
import { isLikelyPublicPage } from '@/lib/url-utils';

export function generateSitemap(data: CrawlData): string {
  const urls = data.pages.filter((p) => isLikelyPublicPage(p.url)).map((p) => {
    const priority = p.classification === 'homepage' ? '1.0'
      : p.classification === 'about' || p.classification === 'service' ? '0.8'
      : p.classification === 'contact' || p.classification === 'faq' ? '0.6'
      : '0.5';

    return `  <url>
    <loc>${escapeXml(p.url)}</loc>
    <priority>${priority}</priority>
    <changefreq>weekly</changefreq>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
