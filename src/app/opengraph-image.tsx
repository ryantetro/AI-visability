import { ImageResponse } from 'next/og';

export const alt = 'airadr — AI Search Optimization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: 'linear-gradient(135deg, #050507 0%, #0a0c14 40%, #0d1020 70%, #0f1428 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  border: '3px solid #356df4',
                  display: 'flex',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                airadr
              </span>
              <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', letterSpacing: '0.1em' }}>
                AI SEARCH OPTIMIZATION
              </span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>
            <div style={{ fontSize: 50, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.035em', lineHeight: 1.12 }}>
              Is AI recommending your business?
            </div>
            <div style={{ fontSize: 21, lineHeight: 1.5, color: 'rgba(203,213,225,0.8)' }}>
              Measure, optimize, and monitor your visibility across ChatGPT, Perplexity, Gemini, Claude, and Grok.
            </div>
          </div>

          {/* Bottom stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#356df4' }}>6</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>AI Engines</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#25c972' }}>30s</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>Free Audit</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#16b7ca' }}>100+</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>AEO Signals</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(53,109,244,0.12)',
                border: '1px solid rgba(53,109,244,0.25)',
                borderRadius: 10,
                padding: '10px 20px',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Get your free score</span>
            </div>
          </div>
        </div>

        {/* Right side: dashboard mockup */}
        <div
          style={{
            width: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '52px 40px 52px 0',
            opacity: 0.2,
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
              <span style={{ fontSize: 52, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>72</span>
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
    { ...size },
  );
}
