import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { callAnthropicHaiku } from '@/lib/content-studio/ai-client';

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

  try {
    const titles = await generateTitleSuggestionsAI(topicStr, typeStr, toneStr);
    return NextResponse.json({ titles });
  } catch (error) {
    console.error('[content-studio] Title suggestion failed:', error);
    // Fall back to heuristic titles if AI fails
    const titles = generateTitleSuggestionsFallback(topicStr, typeStr, toneStr);
    return NextResponse.json({ titles });
  }
}

async function generateTitleSuggestionsAI(
  topic: string,
  type: string,
  tone: string,
): Promise<string[]> {
  const system = `You generate compelling article titles. Return EXACTLY 3 titles, one per line. No numbering, no quotes, no extra text — just the titles.`;

  const userMessage = `Generate 3 compelling ${type} titles for:
Topic: ${topic}
Tone: ${tone}

Rules:
- Each title should be unique in structure (e.g., one question, one "how to", one declarative)
- Keep titles under 70 characters when possible
- Make them specific and click-worthy
- If the topic is a question or prompt, extract the core subject and create proper titles about that subject
- Do NOT include the raw topic text verbatim in the title`;

  const raw = await callAnthropicHaiku(system, userMessage, 256);
  const titles = raw
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim())
    .filter((line) => line.length > 5 && line.length < 120);

  if (titles.length < 2) {
    throw new Error('AI returned too few titles');
  }

  return titles.slice(0, 3);
}

function generateTitleSuggestionsFallback(topic: string, type: string, tone: string): string[] {
  if (!topic) {
    return [
      `The Ultimate ${capitalize(type)} Guide`,
      `Everything You Need to Know: A ${capitalize(type)}`,
      `A Comprehensive ${capitalize(type)} for Your Industry`,
    ];
  }

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
      `${keyPhrase}: What You Need to Know`,
    ],
  };

  return templates[tone] ?? templates.professional;
}

function extractKeyPhrase(topic: string): string {
  let phrase = topic
    .replace(/^(you describe|describe|explain|discuss|write about|tell me about|talk about)\s+/i, '')
    .replace(/^(what is|how to|why|when|where|who|which|can|does|do|is|are|should)\s+/i, '')
    .replace(/^(the best|top|best)\s+/i, '')
    .replace(/\s+and\s+(its|their|his|her)\s+features?\s*$/i, '')
    .replace(/\?$/, '')
    .trim();

  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function capitalize(str: string): string {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
