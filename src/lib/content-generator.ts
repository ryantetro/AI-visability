/**
 * AI-Optimized Content Page Generator.
 *
 * Generates structured content pages designed to maximize AI visibility:
 * - Clear H1/H2/H3 hierarchy
 * - FAQ sections with schema markup
 * - Structured data (JSON-LD)
 * - Natural keyword integration
 * - Citation-friendly format
 */

export interface ContentPageInput {
  topic: string;
  domain: string;
  brand: string;
  industry?: string;
  keywords?: string[];
  tone?: 'professional' | 'conversational' | 'technical';
}

export interface GeneratedContentPage {
  title: string;
  slug: string;
  markdown: string;
  htmlHead: string;
  faqSchema: string;
  wordCount: number;
  generatedAt: string;
}

const SYSTEM_PROMPT = `You are an expert content strategist specializing in AI visibility optimization. Generate content that is:
1. Structured with clear H1, H2, H3 hierarchy for AI parsing
2. Written in a factual, authoritative tone that AI engines trust and cite
3. Includes natural FAQ sections that match how people query AI assistants
4. Uses specific, quotable sentences that AI can extract as direct answers
5. Avoids fluff - every paragraph should contain useful, citable information
6. Includes relevant context that helps AI engines understand the topic deeply

Format the response as Markdown with the following sections:
- Title (H1)
- Introduction (2-3 paragraphs)
- Main content sections (3-5 H2 sections, each with 2-3 paragraphs)
- FAQ section (5-8 questions with concise, direct answers)
- Summary/conclusion

Do NOT include any meta tags, HTML, or frontmatter. Just pure Markdown content.`;

function buildUserPrompt(input: ContentPageInput): string {
  const parts = [
    `Write an AI-optimized content page about: "${input.topic}"`,
    `Brand/Company: ${input.brand}`,
    `Domain: ${input.domain}`,
  ];

  if (input.industry) parts.push(`Industry: ${input.industry}`);
  if (input.keywords?.length) parts.push(`Target keywords: ${input.keywords.join(', ')}`);
  if (input.tone) parts.push(`Tone: ${input.tone}`);

  parts.push(
    '',
    'Requirements:',
    '- Write 1200-1800 words of high-quality content',
    '- Include 5-8 FAQ questions that people would ask an AI assistant about this topic',
    '- Make every paragraph contain specific, quotable facts or recommendations',
    `- Naturally reference ${input.brand} where relevant but do not make it overly promotional`,
    '- Structure content so AI engines can easily extract and cite key points',
  );

  return parts.join('\n');
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

function generateFaqSchema(markdown: string, domain: string): string {
  const faqEntries: Array<{ question: string; answer: string }> = [];

  // Extract FAQ from markdown: look for ### or **Q:** patterns
  const lines = markdown.split('\n');
  let inFaq = false;
  let currentQuestion = '';
  let currentAnswer = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect FAQ section start
    if (/^#{1,2}\s*(FAQ|Frequently Asked)/i.test(trimmed)) {
      inFaq = true;
      continue;
    }

    // Detect end of FAQ section (next H1 or H2 that's not a question)
    if (inFaq && /^#{1,2}\s/.test(trimmed) && !/\?/.test(trimmed)) {
      if (currentQuestion && currentAnswer.trim()) {
        faqEntries.push({ question: currentQuestion, answer: currentAnswer.trim() });
      }
      inFaq = false;
      continue;
    }

    if (!inFaq) continue;

    // Question patterns: ### Question? or **Question?** or #### Question?
    if (/^#{3,4}\s/.test(trimmed) || /^\*\*.+\?\*\*/.test(trimmed)) {
      if (currentQuestion && currentAnswer.trim()) {
        faqEntries.push({ question: currentQuestion, answer: currentAnswer.trim() });
      }
      currentQuestion = trimmed
        .replace(/^#{3,4}\s*/, '')
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .trim();
      currentAnswer = '';
    } else if (currentQuestion && trimmed) {
      currentAnswer += (currentAnswer ? ' ' : '') + trimmed;
    }
  }

  // Capture last FAQ entry
  if (currentQuestion && currentAnswer.trim()) {
    faqEntries.push({ question: currentQuestion, answer: currentAnswer.trim() });
  }

  if (faqEntries.length === 0) return '{}';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };

  return JSON.stringify(schema, null, 2);
}

function generateHtmlHead(title: string, domain: string, topic: string): string {
  return [
    `<title>${escapeHtml(title)} | ${escapeHtml(domain)}</title>`,
    `<meta name="description" content="Comprehensive guide about ${escapeHtml(topic)} by ${escapeHtml(domain)}. AI-optimized content with FAQs and expert insights.">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:type" content="article">`,
    `<link rel="canonical" href="https://${escapeHtml(domain)}/content/${generateSlug(title)}">`,
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Generate an AI-optimized content page using an available AI engine.
 */
export async function generateContentPage(input: ContentPageInput): Promise<GeneratedContentPage> {
  const userPrompt = buildUserPrompt(input);

  // Try OpenAI first, then Anthropic, then Gemini
  const markdown = await callAIForContent(SYSTEM_PROMPT, userPrompt);

  // Extract title from first H1
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? input.topic;
  const slug = generateSlug(title);

  return {
    title,
    slug,
    markdown,
    htmlHead: generateHtmlHead(title, input.domain, input.topic),
    faqSchema: generateFaqSchema(markdown, input.domain),
    wordCount: countWords(markdown),
    generatedAt: new Date().toISOString(),
  };
}

async function callAIForContent(systemPrompt: string, userPrompt: string): Promise<string> {
  // Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch {
      // Fall through to next provider
    }
  }

  // Try Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text) return text;
      }
    } catch {
      // Fall through to next provider
    }
  }

  // Try Google
  if (process.env.GOOGLE_GENAI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GENAI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch {
      // All providers failed
    }
  }

  throw new Error('No AI engine available for content generation. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENAI_API_KEY.');
}
