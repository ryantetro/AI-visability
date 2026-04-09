/**
 * Real AI-powered audience profile generation.
 */

import { callAnthropicHaiku, isAnthropicAvailable } from './ai-client';
import { audienceEnhancePrompt } from './agent-prompts';

export async function enhanceAudienceProfile(
  name: string,
  existingDescription: string | null,
): Promise<string> {
  if (!isAnthropicAvailable()) {
    // Fallback when no API key is configured
    return fallbackProfile(name);
  }

  const { system, userMessage } = audienceEnhancePrompt(name, existingDescription);
  return callAnthropicHaiku(system, userMessage, 1024);
}

function fallbackProfile(name: string): string {
  return `## ${name}

**Demographics:** Decision-makers and professionals in target industries, typically aged 25-55, with moderate to high digital literacy.

**Pain Points:**
- Difficulty finding reliable solutions in a crowded market
- Need for streamlined workflows and efficiency gains
- Budget constraints balanced with quality expectations

**Goals:**
- Improve operational efficiency and ROI
- Stay ahead of industry trends and competitors
- Build sustainable, scalable processes

**Preferred Channels:** LinkedIn, industry publications, webinars, email newsletters

**Content Preferences:** Data-driven insights, actionable guides, case studies with measurable results`;
}
