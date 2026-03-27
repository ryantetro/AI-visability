import { NextRequest, NextResponse } from 'next/server';
import { getPublicScoreSummary } from '@/lib/public-score';
import { getCertifiedSummary, getPublicProfile } from '@/lib/public-proof';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let summary = await getPublicScoreSummary(id);
  let profile = await getPublicProfile(id);

  if ((!summary || !profile) && id.includes('.')) {
    const certified = await getCertifiedSummary(decodeURIComponent(id));
    if (certified) {
      summary = certified.summary;
      profile = certified.profile;
    }
  }

  if (!summary || !profile || !profile.enabled || !profile.badgeEnabled || !profile.verified) {
    return new NextResponse('Not found', { status: 404 });
  }

  const domain = escapeXml(summary.domain);
  const score = String(summary.percentage);
  const band = escapeXml(summary.bandInfo.label);
  const color = summary.bandInfo.color;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="96" viewBox="0 0 360 96" role="img" aria-label="airadr score badge for ${domain}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101726" />
      <stop offset="100%" stop-color="#070b14" />
    </linearGradient>
  </defs>
  <rect width="360" height="96" rx="24" fill="url(#bg)" stroke="rgba(131,160,255,0.26)" />
  <circle cx="60" cy="48" r="28" fill="${color}20" stroke="${color}" stroke-width="4" />
  <text x="60" y="55" text-anchor="middle" fill="#f5f7ff" font-size="20" font-family="'Space Grotesk', 'Helvetica Neue', sans-serif" font-weight="700">${score}</text>
  <text x="104" y="34" fill="#93baff" font-size="11" font-family="'IBM Plex Mono', monospace" font-weight="700" letter-spacing="1.8">airadr SCORE</text>
  <text x="104" y="56" fill="#f5f7ff" font-size="18" font-family="'Space Grotesk', 'Helvetica Neue', sans-serif" font-weight="700">${domain}</text>
  <text x="104" y="75" fill="#aab4d0" font-size="12" font-family="'Manrope', 'Helvetica Neue', sans-serif">${band}</text>
</svg>`.trim();

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
