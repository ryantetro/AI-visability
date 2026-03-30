import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0b',
        }}
      >
        <svg width="140" height="140" viewBox="0 0 32 32" aria-hidden>
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
    ),
    { ...size },
  );
}
