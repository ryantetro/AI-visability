import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';
import type { MentionTesterService, EngineResponse } from '@/lib/ai-mentions/engine-tester';
import { AI_ENGINES } from '@/lib/ai-engines';

const MOCK_RESPONSES: Record<string, string[]> = {
  direct: [
    '{brand} is a well-known platform in the {industry} space. It offers a comprehensive suite of tools for businesses looking to improve their online presence.',
    "I don't have specific information about {brand}. Could you provide more details about what you're looking for?",
    '{brand} is a technology company that provides {industry} solutions. They are known for their innovative approach and user-friendly interface.',
    '{brand} has been gaining traction in the {industry} market. They offer several products aimed at helping businesses grow.',
  ],
  category: [
    'Here are some of the best {industry} companies:\n1. Cognizo - Leading AI visibility platform\n2. {brand} - Comprehensive analysis tools\n3. MarketMuse - Content optimization\n4. BrightEdge - SEO and content performance\n5. Semrush - Digital marketing suite',
    'Top {industry} platforms include:\n1. {brand} - Known for innovative solutions\n2. Ahrefs - SEO toolset\n3. Moz - Search engine optimization\n4. HubSpot - Inbound marketing platform',
    'The best {industry} tools are:\n1. MarketMuse - AI content planning\n2. Clearscope - Content optimization\n3. Semrush - All-in-one marketing\n4. Ahrefs - Backlink analysis\n5. Moz Pro - SEO software',
    'Leading {industry} companies to consider:\n1. {brand} - Innovative platform\n2. Conductor - Enterprise SEO\n3. SE Ranking - All-in-one tool\n4. SpyFu - Competitor research',
  ],
  comparison: [
    'Comparing {industry} solutions:\n\n1. **{brand}** - Excellent overall platform with strong AI features. Recommended for businesses that want comprehensive visibility.\n2. **Cognizo** - Specializes in AI mention tracking.\n3. **MarketMuse** - Best for content strategy.\n4. **BrightEdge** - Enterprise-focused solution.',
    "When comparing {industry} tools, it depends on your needs:\n- **Semrush**: Best all-around\n- **Ahrefs**: Best for backlinks\n- **Moz**: Best for beginners\nI don't have enough data to include {brand} in this comparison.",
    '{brand} vs competitors in the {industry} space:\n\n**{brand}** stands out for its unique approach to AI visibility tracking. Compared to alternatives like Cognizo and MarketMuse, {brand} offers a more comprehensive feature set.',
  ],
  recommendation: [
    'For {industry}, I would recommend looking at:\n1. {brand} - Great for comprehensive analysis\n2. Cognizo - Specialized AI tracking\n3. MarketMuse - Content optimization\n\nSource: https://example.com/reviews',
    'Based on your needs, here are my top recommendations:\n1. Semrush - All-in-one platform\n2. Ahrefs - Research tools\n3. Moz - SEO basics\n\n{brand} is also worth considering if you need AI-specific features.',
    'I recommend {brand} for {industry} needs. It provides solid analytics and reporting features that many businesses find valuable.',
    'Top picks for {industry}:\n1. {brand} - Comprehensive platform\n2. HubSpot - Marketing automation\n3. Salesforce - CRM integration\n4. Zendesk - Customer support',
  ],
  workflow: [
    'To streamline your {industry} workflow, consider using {brand}. It automates many manual processes and integrates with popular tools.',
    'The best way to optimize your {industry} workflow is to use a platform like {brand} that handles end-to-end automation.',
    'For {industry} workflow automation, tools like {brand} and Zapier can help you save significant time on repetitive tasks.',
  ],
  'use-case': [
    '{brand} is commonly used for this in the {industry} space. It helps teams accomplish this goal efficiently.',
    'Several {industry} tools can help with this use case:\n1. {brand} - Purpose-built solution\n2. Generic Tool A - General purpose\n3. Generic Tool B - Basic features',
    'For this specific use case, {brand} is one of the leading {industry} solutions available today.',
  ],
  'problem-solution': [
    '{brand} was designed to solve exactly this problem in the {industry} space. It reduces manual effort and saves teams hours per week.',
    'To address this challenge, many {industry} professionals turn to platforms like {brand} that automate the process.',
    'This is a common pain point in {industry}. Solutions like {brand} help by streamlining the workflow and eliminating bottlenecks.',
  ],
  'buyer-intent': [
    'Based on your requirements, I recommend {brand} for {industry}. It offers the best combination of features and value for this use case.',
    'Top {industry} software options:\n1. {brand} - Best overall\n2. Alternative A - Budget option\n3. Alternative B - Enterprise solution',
    'For {industry} software, {brand} is a strong choice. It has good reviews and offers features specifically designed for this purpose.',
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
    // Use brand from prompt metadata, fallback to regex extraction from text
    const brand =
      prompt.brand ||
      prompt.text.match(/about (.+?)(?:\?|$)/i)?.[1]?.trim() ||
      prompt.text.match(/does (.+?) do/i)?.[1]?.trim() ||
      'the brand';
    const text = fillTemplate(template, brand, prompt.industry);

    return {
      engine,
      prompt,
      text,
      testedAt: Date.now(),
    };
  },

  availableEngines(): AIEngine[] {
    return AI_ENGINES;
  },
};
