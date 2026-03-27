import { ImageResponse } from 'next/og';
import { getPublicScoreSummary } from '@/lib/public-score';

export const alt = 'airadr score card';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface OgImageProps {
  params: Promise<{ id: string }>;
}

export default async function OgImage({ params }: OgImageProps) {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#111827',
            color: 'white',
            fontSize: 52,
            fontWeight: 700,
          }}
        >
          Score not available
        </div>
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,41,59,1) 55%, rgba(59,130,246,0.88) 100%)',
          color: 'white',
          padding: '54px 60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 24, letterSpacing: '0.34em', textTransform: 'uppercase', opacity: 0.8 }}>
            airadr
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{summary.domain}</div>
          <div style={{ fontSize: 28, opacity: 0.88 }}>
            {summary.bandInfo.label} for AI visibility
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 20, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.7 }}>
              Score
            </div>
            <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 0.9 }}>{summary.percentage}</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 250,
              padding: '18px 28px',
              borderRadius: 999,
              background: summary.bandInfo.color,
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {summary.bandInfo.label}
          </div>
        </div>
      </div>
    ),
    size
  );
}
