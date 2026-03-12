import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getClientIp, startScan } from '@/lib/scan-workflow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await startScan(
      {
        url: body.url,
        force: body.force,
        ip: getClientIp(request.headers),
      },
      {
        schedule(task) {
          after(task);
        },
      }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 });
  }
}
