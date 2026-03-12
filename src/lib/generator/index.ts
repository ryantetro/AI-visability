import { CrawlData } from '@/types/crawler';
import { GeneratedFiles } from '@/types/generated-files';
import { generateLlmsTxt } from './llms-txt';
import { generateRobotsTxt } from './robots-txt';
import { generateJsonLd } from './json-ld';
import { generateSitemap } from './sitemap';

export async function generateAllFiles(
  crawlData: CrawlData
): Promise<GeneratedFiles> {
  const platform = crawlData.detectedPlatform || 'custom';
  const llmsTxt = await generateLlmsTxt(crawlData);
  const robotsTxt = generateRobotsTxt(crawlData);
  const jsonLd = generateJsonLd(crawlData);
  const sitemap = generateSitemap(crawlData);

  return {
    scanId: crawlData.normalizedUrl,
    generatedAt: Date.now(),
    detectedPlatform: platform,
    files: [
      {
        filename: 'llms.txt',
        content: llmsTxt,
        description: 'Helps AI models understand and reference your site. Place in your site root.',
        installInstructions: getInstallInstructions(platform, 'llms.txt'),
      },
      {
        filename: 'robots.txt',
        content: robotsTxt,
        description: 'Updated robots.txt with AI bot allow directives.',
        installInstructions: getInstallInstructions(platform, 'robots.txt'),
      },
      {
        filename: 'organization-schema.json',
        content: jsonLd,
        description: 'JSON-LD structured data for Organization and FAQ schemas.',
        installInstructions: getInstallInstructions(platform, 'organization-schema.json'),
      },
      {
        filename: 'sitemap.xml',
        content: sitemap,
        description: 'XML sitemap generated from crawled pages.',
        installInstructions: getInstallInstructions(platform, 'sitemap.xml'),
      },
    ],
  };
}

function getInstallInstructions(platform: CrawlData['detectedPlatform'], filename: string): string {
  const customInstructions: Record<string, string> = {
    'llms.txt':
      'Upload this file to your site root so it resolves at /llms.txt. For code-based sites, place it in your public directory before deploying.',
    'robots.txt':
      'Replace your existing robots.txt with this file, or merge in the AI crawler directives, then redeploy so it resolves at /robots.txt.',
    'organization-schema.json':
      'Add this JSON-LD as a <script type="application/ld+json"> tag in the <head> of your homepage layout or site shell.',
    'sitemap.xml':
      'Upload this to your site root at /sitemap.xml and make sure your robots.txt references it with a Sitemap directive.',
  };

  if (platform === 'wordpress') {
    const instructions: Record<string, string> = {
      'llms.txt':
        'Upload llms.txt to the WordPress site root via your host file manager or FTP. If your host blocks root file uploads, serve it through a simple plugin or static file manager plugin.',
      'robots.txt':
        'Update robots.txt through your SEO plugin or upload this file to the WordPress root. Keep any existing crawl rules you still need, then append these AI bot directives.',
      'organization-schema.json':
        'Paste this JSON-LD into your homepage head using a header/footer plugin or your theme’s global head injection setting.',
      'sitemap.xml':
        'If your SEO plugin already generates a sitemap, merge these URLs into that source instead of replacing it. Otherwise upload this file to the root and reference it from robots.txt.',
    };
    return instructions[filename];
  }

  if (platform === 'squarespace') {
    const instructions: Record<string, string> = {
      'llms.txt':
        'Squarespace does not natively expose arbitrary root text files. Best-effort fallback: host llms.txt on a connected static file location, then link it prominently until you can proxy it from the root.',
      'robots.txt':
        'Use Settings → Crawlers to review native robots behavior. If full robots.txt replacement is not available on your plan, copy these directives into the platform controls you do have and keep the sitemap reference.',
      'organization-schema.json':
        'Paste this JSON-LD into Settings → Advanced → Code Injection so it loads in the site head on your homepage.',
      'sitemap.xml':
        'Squarespace already generates a sitemap. Do not replace the platform sitemap; instead verify the native sitemap is live and referenced anywhere you control robots behavior.',
    };
    return instructions[filename];
  }

  if (platform === 'webflow') {
    const instructions: Record<string, string> = {
      'llms.txt':
        'Upload llms.txt to Webflow hosting or your connected static asset layer, then map it to /llms.txt if your hosting stack supports root file routing.',
      'robots.txt':
        'Open Project Settings → SEO → Robots.txt and paste these directives there so Webflow serves the updated robots policy directly.',
      'organization-schema.json':
        'Paste this JSON-LD into Project Settings → Custom Code → Head Code, or into the homepage page settings if you want it scoped to one page.',
      'sitemap.xml':
        'Webflow generates its own sitemap. Use this file as a reference for what should be included, but prefer keeping the native Webflow sitemap enabled.',
    };
    return instructions[filename];
  }

  return customInstructions[filename];
}
