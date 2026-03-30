import { ImageResponse } from 'next/og';

export const alt = 'airadr — AI Search Optimization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Load Space Grotesk 700 for OG (Satori requires raw font bytes). */
async function getSpaceGroteskBold(): Promise<ArrayBuffer | undefined> {
  try {
    const cssRes = await fetch(
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1)' } },
    );
    const css = await cssRes.text();
    const urlMatch = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
    if (!urlMatch?.[1]) return undefined;
    const fontRes = await fetch(urlMatch[1]);
    if (!fontRes.ok) return undefined;
    return fontRes.arrayBuffer();
  } catch {
    return undefined;
  }
}

export default async function OpengraphImage() {
  const fontData = await getSpaceGroteskBold();
  const fonts = fontData
    ? ([
        {
          name: 'Space Grotesk',
          data: fontData,
          style: 'normal' as const,
          weight: 700 as const,
        },
      ] as const)
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background:
            'linear-gradient(145deg, #050505 0%, #0c0d10 38%, #0f1419 72%, rgba(36, 85, 220, 0.22) 100%)',
          color: '#f5f7ff',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            width: '70%',
            height: 320,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(53, 109, 244, 0.16), transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, zIndex: 1 }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              background: '#0a0a0b',
              border: '2px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="76" height="76" viewBox="0 0 32 32" aria-hidden>
              <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <path
                d="M16 3 A13 13 0 0 1 27.3 18.5"
                fill="none"
                stroke="#356df4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M27.3 18.5 A13 13 0 0 1 4.7 18.5"
                fill="none"
                stroke="#25c972"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M4.7 18.5 A13 13 0 0 1 16 3"
                fill="none"
                stroke="#16b7ca"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                fontFamily: fonts ? 'Space Grotesk' : 'system-ui, sans-serif',
                fontSize: 62,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              airadr
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: 'rgba(201, 208, 230, 0.92)',
              }}
            >
              AI Search Optimization
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920, zIndex: 1 }}>
          <div
            style={{
              fontFamily: fonts ? 'Space Grotesk' : 'system-ui, sans-serif',
              fontSize: 54,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
            }}
          >
            Can AI find and recommend your business?
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              color: 'rgba(201, 208, 230, 0.88)',
              maxWidth: 820,
            }}
          >
            Free visibility score, actionable fixes, and monitoring for ChatGPT, Perplexity, Gemini and Claude.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 32,
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: '#356df4' }} />
              <span style={{ width: 12, height: 12, borderRadius: 6, background: '#25c972' }} />
              <span style={{ width: 12, height: 12, borderRadius: 6, background: '#16b7ca' }} />
            </div>
            <span style={{ fontSize: 20, color: 'rgba(170, 180, 208, 0.85)', letterSpacing: '0.06em' }}>
              AI visibility audit
            </span>
          </div>
          <span style={{ fontSize: 20, color: 'rgba(170, 180, 208, 0.75)' }}>30-second free audit</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts ? [...fonts] : undefined,
    },
  );
}
