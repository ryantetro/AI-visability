import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPromptMonitoring } from '@/lib/services/registry';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }

  const pm = getPromptMonitoring();
  const prompts = await pm.listPrompts(domain);
  const results = await pm.listPromptResults(domain, 200);

  return NextResponse.json({ prompts, results });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json();
  const { domain, promptText, category, industry } = body ?? {};

  if (!domain || !promptText) {
    return NextResponse.json({ error: 'domain and promptText are required.' }, { status: 400 });
  }

  if (typeof promptText !== 'string' || promptText.trim().length < 5) {
    return NextResponse.json({ error: 'Prompt text must be at least 5 characters.' }, { status: 400 });
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
