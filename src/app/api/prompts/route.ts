import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPromptMonitoring } from '@/lib/services/registry';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const rawDomain = request.nextUrl.searchParams.get('domain');
  if (!rawDomain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }
  const domain = rawDomain.trim().toLowerCase();
  if (domain.length > 253) {
    return NextResponse.json({ error: 'Invalid domain.' }, { status: 400 });
  }

  const pm = getPromptMonitoring();
  const prompts = await pm.listPrompts(domain, user.id);
  const results = await pm.listPromptResults(domain, 200, user.id);

  return NextResponse.json({ prompts, results });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { domain, promptText, category, industry } = body ?? {};

  if (!domain || !promptText) {
    return NextResponse.json({ error: 'domain and promptText are required.' }, { status: 400 });
  }

  if (typeof promptText !== 'string' || promptText.trim().length < 5) {
    return NextResponse.json({ error: 'Prompt text must be at least 5 characters.' }, { status: 400 });
  }
  if (promptText.length > 500) {
    return NextResponse.json({ error: 'promptText must be 500 characters or fewer.' }, { status: 400 });
  }
  if (typeof domain === 'string' && domain.length > 253) {
    return NextResponse.json({ error: 'domain must be 253 characters or fewer.' }, { status: 400 });
  }
  if (category !== undefined && category !== null && String(category).length > 50) {
    return NextResponse.json({ error: 'category must be 50 characters or fewer.' }, { status: 400 });
  }
  if (industry !== undefined && industry !== null && String(industry).length > 50) {
    return NextResponse.json({ error: 'industry must be 50 characters or fewer.' }, { status: 400 });
  }

  const pm = getPromptMonitoring();
  const prompt = await pm.createPrompt({
    domain,
    userId: user.id,
    promptText: promptText.trim(),
    category: category || 'custom',
    industry: industry || null,
    active: true,
  });

  return NextResponse.json(prompt, { status: 201 });
}
