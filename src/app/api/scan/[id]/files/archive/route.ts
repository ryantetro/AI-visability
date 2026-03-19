import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getDatabase } from '@/lib/services/registry';
import { getUserAccess } from '@/lib/access';
import { generateAllFiles } from '@/lib/generator';
import { createArchiveFilename, createGeneratedFilesArchive } from '@/lib/files-archive';
import { CrawlData } from '@/types/crawler';
import { GeneratedFiles } from '@/types/generated-files';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (!scan.email || scan.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This archive belongs to another account.' }, { status: 403 });
  }

  // Check plan-based access (preferred) with fallback to legacy scan.paid flag
  let hasAccess = !!scan.paid;
  try {
    const access = await getUserAccess(user.id, user.email);
    hasAccess = access.canAccessFeature('file_download') || hasAccess;
  } catch {
    // Profile lookup failed — fall back to legacy scan.paid check
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Payment required' }, { status: 403 });
  }

  if (scan.status !== 'complete' || !scan.crawlData) {
    return NextResponse.json({ error: 'Scan not complete' }, { status: 400 });
  }

  const generatedFiles = scan.generatedFiles as GeneratedFiles | undefined;
  if (!generatedFiles || !generatedFiles.detectedPlatform) {
    scan.generatedFiles = await generateAllFiles(scan.crawlData as CrawlData);
    await db.saveScan(scan);
  }

  const archive = createGeneratedFilesArchive(scan.generatedFiles as GeneratedFiles);
  const filename = createArchiveFilename(scan.url);

  return new NextResponse(Buffer.from(archive), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
