import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('content_studio')) {
    return NextResponse.json({ error: 'Content Studio requires a Pro plan or higher.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { topic, content_type, tone } = body;
  if (!topic && !content_type) {
    return NextResponse.json({ error: 'topic or content_type is required.' }, { status: 400 });
  }

  const topicStr = String(topic || '').trim();
  const typeStr = String(content_type || 'blog_post').replace(/_/g, ' ');
  const toneStr = String(tone || 'professional');

  // Generate contextual title suggestions based on input parameters.
  // In production this would call an LLM — for now use smart heuristic templates.
  const titles = generateTitleSuggestions(topicStr, typeStr, toneStr);

  return NextResponse.json({ titles });
}

function generateTitleSuggestions(topic: string, type: string, tone: string): string[] {
  if (!topic) {
    return [
      `The Ultimate ${capitalize(type)} Guide`,
      `Everything You Need to Know: A ${capitalize(type)}`,
      `A Comprehensive ${capitalize(type)} for Your Industry`,
    ];
  }

  const shortTopic = topic.length > 60 ? topic.slice(0, 57) + '...' : topic;
  const keyPhrase = extractKeyPhrase(topic);

  const templates: Record<string, string[]> = {
    professional: [
      `${keyPhrase}: A Comprehensive Guide`,
      `How to Master ${keyPhrase} in 2026`,
      `The Definitive Guide to ${keyPhrase}`,
    ],
    casual: [
      `Everything You Need to Know About ${keyPhrase}`,
      `Why ${keyPhrase} Matters (And What to Do About It)`,
      `${keyPhrase} Made Simple: Your Go-To Guide`,
    ],
    technical: [
      `${keyPhrase}: Technical Deep Dive`,
      `Implementing ${keyPhrase}: Best Practices & Strategies`,
      `A Data-Driven Approach to ${keyPhrase}`,
    ],
    friendly: [
      `Your Friendly Guide to ${keyPhrase}`,
      `Let's Talk About ${keyPhrase}`,
      `${keyPhrase}: What You Need to Know (No Jargon!)`,
    ],
  };

  return templates[tone] ?? templates.professional;
}

function extractKeyPhrase(topic: string): string {
  // Remove common question prefixes to get the core phrase
  let phrase = topic
    .replace(/^(what is|how to|why|when|where|who|which|can|does|do|is|are|should)\s+/i, '')
    .replace(/^(the best|top|best)\s+/i, '')
    .replace(/\?$/, '')
    .trim();

  // Capitalize first letter
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function capitalize(str: string): string {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
