import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getOrderById } from '@/lib/fix-my-site';
import type { GeneratedFile } from '@/lib/fix-my-site';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const files = (order.generated_files ?? {}) as Record<string, GeneratedFile>;
  if (Object.keys(files).length === 0) {
    return NextResponse.json({ error: 'No generated files yet' }, { status: 400 });
  }

  const zip = new JSZip();

  // Add each generated file
  for (const [, file] of Object.entries(files)) {
    zip.file(file.filename, file.content);
  }

  // Add implementation guide
  const guide = order.guide_markdown
    ?? '# Implementation Guide\n\nGuide was not generated — the agent may have been interrupted. Try re-running from your dashboard.';
  zip.file('IMPLEMENTATION-GUIDE.md', guide);

  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeDomain = order.domain.replace(/[^a-zA-Z0-9.-]/g, '_');

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="fix-my-site-${safeDomain}.zip"`,
    },
  });
}
