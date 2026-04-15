import { NextRequest, NextResponse } from 'next/server';
import { buildReportPromptBundle } from '@/lib/llm-prompts';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getDatabase } from '@/lib/services/registry';
import { generateAllFiles } from '@/lib/generator';
import { CrawlData } from '@/types/crawler';
import { GeneratedFiles } from '@/types/generated-files';
import { ScoreResult } from '@/types/score';
import { getEffectiveUserEmails } from '@/lib/team-management';

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

  const effectiveEmails = new Set(await getEffectiveUserEmails(user.id, user.email));
  if (!scan.email || !effectiveEmails.has(scan.email.toLowerCase())) {
    return NextResponse.json({ error: 'This file bundle belongs to another account.' }, { status: 403 });
  }

  if (scan.status !== 'complete' || !scan.crawlData) {
    return NextResponse.json({ error: 'Scan not complete' }, { status: 400 });
  }

  let hasPaid = !!scan.paid;
  try {
    const access = await getUserAccess(user.id, user.email);
    hasPaid = access.isPaid || hasPaid;
  } catch {
    // Fall back to the legacy scan flag if access lookup fails.
  }

  if (!hasPaid) {
    return NextResponse.json({ error: 'Upgrade required to unlock generated files.' }, { status: 403 });
  }

  // Generate files if not cached
  const generatedFiles = scan.generatedFiles as GeneratedFiles | undefined;
  if (!generatedFiles || !generatedFiles.detectedPlatform) {
    const files = await generateAllFiles(scan.crawlData as CrawlData);
    scan.generatedFiles = files;
    await db.saveScan(scan);
  }

  const scoreResult = scan.scoreResult as ScoreResult | undefined;

  return NextResponse.json({
    ...(scan.generatedFiles as GeneratedFiles),
    url: scan.normalizedUrl || scan.url,
    copyToLlm: scoreResult ? buildReportPromptBundle(scan.normalizedUrl || scan.url, scoreResult) : null,
  });
}
