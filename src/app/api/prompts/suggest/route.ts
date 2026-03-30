import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getDatabase, getPromptMonitoring } from '@/lib/services/registry';
import { canUseOpenAI } from '@/lib/services/openai-ai';
import type { CrawlData } from '@/types/crawler';
import type { MentionPrompt } from '@/types/ai-mentions';
import { buildBusinessProfile, generatePrompts } from '@/lib/ai-mentions/prompt-generator';
import { generatePromptsWithLLM } from '@/lib/ai-mentions/llm-prompt-generator';

function normalizePromptText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isCrawlData(value: unknown): value is CrawlData {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return Array.isArray(o.pages);
}

function mentionToLibraryCategory(cat: MentionPrompt['category']): 'brand' | 'competitor' | 'industry' | 'custom' {
  switch (cat) {
    case 'direct':
      return 'brand';
    case 'comparison':
      return 'competitor';
    case 'category':
    case 'recommendation':
    case 'buyer-intent':
    case 'use-case':
    case 'workflow':
    case 'problem-solution':
      return 'industry';
    default:
      return 'custom';
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const domainRaw = typeof body === 'object' && body !== null && 'domain' in body
    ? (body as { domain?: unknown }).domain
    : undefined;
  if (typeof domainRaw !== 'string' || !domainRaw.trim()) {
    return NextResponse.json({ error: 'domain is required.' }, { status: 400 });
  }
  const domain = domainRaw.trim().toLowerCase();
  if (domain.length > 253) {
    return NextResponse.json({ error: 'Invalid domain.' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  const pm = getPromptMonitoring();
  const existing = await pm.listPrompts(domain, user.id);
  const existingKeys = new Set(existing.map((p) => normalizePromptText(p.promptText)));

  const db = getDatabase();
  const scan = await db.findLatestScanByDomain(domain, user.email);
  if (!scan?.crawlData || !isCrawlData(scan.crawlData)) {
    return NextResponse.json(
      {
        error:
          'No completed site scan found for this domain. Run a scan first, then try suggesting prompts again.',
      },
      { status: 404 },
    );
  }

  const crawl = scan.crawlData;
  if (!crawl.pages?.length) {
    return NextResponse.json(
      {
        error: 'The latest scan has no crawl pages. Re-run a full scan and try again.',
      },
      { status: 422 },
    );
  }

  const profile = buildBusinessProfile(crawl);

  let mentionPrompts: MentionPrompt[];
  let source: 'llm' | 'heuristic';

  if (canUseOpenAI()) {
    try {
      mentionPrompts = await generatePromptsWithLLM(crawl, profile, { timeoutMs: 45_000 });
      source = 'llm';
    } catch (err) {
      console.warn('[prompts/suggest] LLM generation failed, using heuristic:', err);
      mentionPrompts = generatePrompts(crawl, profile);
      source = 'heuristic';
    }
  } else {
    mentionPrompts = generatePrompts(crawl, profile);
    source = 'heuristic';
  }

  const maxReturn = 24;
  const suggestions: { text: string; category: string }[] = [];

  for (const mp of mentionPrompts) {
    const cat = mentionToLibraryCategory(mp.category);
    const key = normalizePromptText(mp.text);
    if (!key || existingKeys.has(key)) continue;
    existingKeys.add(key);
    suggestions.push({ text: mp.text.trim(), category: cat });
    if (suggestions.length >= maxReturn) break;
  }

  return NextResponse.json({
    suggestions,
    source,
    remainingSlots:
      Number.isFinite(access.maxPrompts) && access.maxPrompts >= 0
        ? Math.max(0, access.maxPrompts - existing.length)
        : null,
  });
}
