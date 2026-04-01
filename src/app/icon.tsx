import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(99,106,126,0.55)" strokeWidth="2.5" />
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
