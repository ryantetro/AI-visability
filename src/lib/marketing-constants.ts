/**
 * Optional public score UUID for landing-page “sample report” CTA.
 * Set in `.env.local` as `NEXT_PUBLIC_SAMPLE_SCORE_ID` (e.g. a completed scan id whose `/score/{id}` page is public).
 */
export const MARKETING_SAMPLE_SCORE_ID: string =
  typeof process.env.NEXT_PUBLIC_SAMPLE_SCORE_ID === 'string'
    ? process.env.NEXT_PUBLIC_SAMPLE_SCORE_ID.trim()
    : '';
