import { NextRequest, NextResponse } from 'next/server';
import { AuthActionError, sendPasswordReset } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await sendPasswordReset(body.email || '', {
      next: body.next || null,
      scanUrl: body.scanUrl || null,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[auth.forgot-password] reset request failed', error);
    return NextResponse.json(
      {
        code: error instanceof AuthActionError ? error.code : 'AUTH_ERROR',
        error: error instanceof Error ? error.message : 'Failed to send your reset link.',
      },
      { status: 400 }
    );
  }
}
