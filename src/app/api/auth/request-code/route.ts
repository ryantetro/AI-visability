import { NextRequest, NextResponse } from 'next/server';
import { requestOtp } from '@/lib/auth';

// In-memory rate limiter: 3 requests per email per 10 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const otpAttempts = new Map<string, number[]>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.trim().toLowerCase();
  const timestamps = otpAttempts.get(key) ?? [];

  // Remove expired entries
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  otpAttempts.set(key, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: 'Too many sign-in requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    await requestOtp(email, body.next);
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send sign-in code.' },
      { status: 400 }
    );
  }
}
