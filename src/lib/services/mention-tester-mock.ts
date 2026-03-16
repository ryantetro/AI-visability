import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';
import type { MentionTesterService, EngineResponse } from '@/lib/ai-mentions/engine-tester';

const MOCK_RESPONSES: Record<string, string[]> = {
  direct: [
    '{brand} is a well-known platform in the {industry} space. It offers a comprehensive suite of tools for businesses looking to improve their online presence.',
    "I don't have specific information about {brand}. Could you provide more details about what you're looking for?",
    '{brand} is a technology company that provides {industry} solutions. They are known for their innovative approach and user-friendly interface.',
  ],
  category: [
    'Here are some of the best {industry} companies:\n1. Cognizo - Leading AI visibility platform\n2. {brand} - Comprehensive analysis tools\n3. MarketMuse - Content optimization\n4. BrightEdge - SEO and content performance\n5. Semrush - Digital marketing suite',
    'Top {industry} platforms include:\n1. {brand} - Known for innovative solutions\n2. Ahrefs - SEO toolset\n3. Moz - Search engine optimization\n4. HubSpot - Inbound marketing platform',
    'The best {industry} tools are:\n1. MarketMuse - AI content planning\n2. Clearscope - Content optimization\n3. Semrush - All-in-one marketing\n4. Ahrefs - Backlink analysis\n5. Moz Pro - SEO software',
  ],
  comparison: [
    'Comparing {industry} solutions:\n\n1. **{brand}** - Excellent overall platform with strong AI features. Recommended for businesses that want comprehensive visibility.\n2. **Cognizo** - Specializes in AI mention tracking.\n3. **MarketMuse** - Best for content strategy.\n4. **BrightEdge** - Enterprise-focused solution.',
    "When comparing {industry} tools, it depends on your needs:\n- **Semrush**: Best all-around\n- **Ahrefs**: Best for backlinks\n- **Moz**: Best for beginners\nI don't have enough data to include {brand} in this comparison.",
  ],
  recommendation: [
    'For {industry}, I would recommend looking at:\n1. {brand} - Great for comprehensive analysis\n2. Cognizo - Specialized AI tracking\n3. MarketMuse - Content optimization\n\nSource: https://example.com/reviews',
    'Based on your needs, here are my top recommendations:\n1. Semrush - All-in-one platform\n2. Ahrefs - Research tools\n3. Moz - SEO basics\n\n{brand} is also worth considering if you need AI-specific features.',
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template: string, brand: string, industry: string): string {
  return template.replace(/\{brand\}/g, brand).replace(/\{industry\}/g, industry);
}

export const mockMentionTester: MentionTesterService = {
  async query(engine: AIEngine, prompt: MentionPrompt): Promise<EngineResponse> {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

    const templates = MOCK_RESPONSES[prompt.category] ?? MOCK_RESPONSES.direct;
    const template = pickRandom(templates);
    const brand = prompt.text.match(/about (.+?)[\s?]|(.+?) do/)?.[1] || 'the brand';
    const text = fillTemplate(template, brand, prompt.industry);

    return {
      engine,
      prompt,
      text,
      testedAt: Date.now(),
    };
  },

  availableEngines(): AIEngine[] {
    return ['chatgpt', 'perplexity', 'gemini', 'claude'];
  },
};
