import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { generateAllFiles } from '@/lib/generator';
import { createArchiveFilename, createGeneratedFilesArchive } from '@/lib/files-archive';
import { CrawlData } from '@/types/crawler';
import { GeneratedFiles } from '@/types/generated-files';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (!scan.paid) {
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
