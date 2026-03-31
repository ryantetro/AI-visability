import { ImageResponse } from 'next/og';

export const alt = 'airadr — AI Search Optimization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
  const boldData = await getSpaceGroteskBold();
  const fonts = boldData
    ? [{ name: 'Space Grotesk', data: boldData, style: 'normal' as const, weight: 700 as const }]
    : undefined;
  const fontFamily = fonts ? 'Space Grotesk' : 'system-ui, sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: 'linear-gradient(135deg, #050507 0%, #0a0c14 40%, #0d1020 70%, #0f1428 100%)',
        }}
      >
        {/* Left content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '52px 56px',
            flex: 1,
          }}
        >
          {/* Logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                <path d="M16 3 A13 13 0 0 1 27.3 18.5" fill="none" stroke="#356df4" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M27.3 18.5 A13 13 0 0 1 4.7 18.5" fill="none" stroke="#25c972" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4.7 18.5 A13 13 0 0 1 16 3" fill="none" stroke="#16b7ca" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontFamily, fontSize: 26, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                airadr
              </span>
              <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', letterSpacing: '0.1em' }}>
                AI SEARCH OPTIMIZATION
              </span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div style={{ fontFamily, fontSize: 48, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.035em', lineHeight: 1.12 }}>
              Is AI recommending your business?
            </div>
            <div style={{ fontSize: 21, lineHeight: 1.5, color: 'rgba(203,213,225,0.8)' }}>
              Measure, optimize, and monitor your visibility across ChatGPT, Perplexity, Gemini, Claude, and Grok.
            </div>
          </div>

          {/* Bottom stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily, fontSize: 30, fontWeight: 700, color: '#356df4' }}>6</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>AI Engines</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily, fontSize: 30, fontWeight: 700, color: '#25c972' }}>30s</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>Free Audit</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily, fontSize: 30, fontWeight: 700, color: '#16b7ca' }}>100+</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>AEO Signals</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(53,109,244,0.12)', border: '1px solid rgba(53,109,244,0.25)', borderRadius: 10, padding: '10px 20px' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily }}>Get your free score</span>
              <span style={{ fontSize: 16, color: '#356df4' }}>→</span>
            </div>
          </div>
        </div>

        {/* Right side: dashboard mockup */}
        <div
          style={{
            width: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '52px 40px 52px 0',
            opacity: 0.25,
          }}
        >
          {/* Score card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
              AI VISIBILITY SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily, fontSize: 52, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>72</span>
              <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.2)' }}>/100</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, display: 'flex' }}>
              <div style={{ width: '72%', height: 6, background: 'linear-gradient(90deg, #356df4, #25c972)', borderRadius: 3, display: 'flex' }} />
            </div>
          </div>

          {/* Platform bars */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '18px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>ChatGPT</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>85%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex' }}>
              <div style={{ width: '85%', height: 4, background: '#25c972', borderRadius: 2, opacity: 0.6, display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Perplexity</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>72%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex' }}>
              <div style={{ width: '72%', height: 4, background: '#356df4', borderRadius: 2, opacity: 0.6, display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Gemini</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>65%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex' }}>
              <div style={{ width: '65%', height: 4, background: '#16b7ca', borderRadius: 2, opacity: 0.6, display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Claude</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>58%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex' }}>
              <div style={{ width: '58%', height: 4, background: '#f59e0b', borderRadius: 2, opacity: 0.6, display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Grok</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>44%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex' }}>
              <div style={{ width: '44%', height: 4, background: '#a855f7', borderRadius: 2, opacity: 0.6, display: 'flex' }} />
            </div>
          </div>

          {/* Action preview */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
              NEXT ACTION
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
              Add FAQ schema to /pricing
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(37,201,114,0.5)', background: 'rgba(37,201,114,0.08)', padding: '3px 10px', borderRadius: 6, display: 'flex' }}>
                +8 pts
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', padding: '3px 10px', borderRadius: 6, display: 'flex' }}>
                Easy
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
