import { getPromptContext, inferBrandName } from '@/lib/optimize/shared';
import type { ContentOpportunity, ContentStudioType } from '@/lib/optimize/types';

const CATEGORY_WEIGHTS: Record<string, number> = {
  brand: 3,
  competitor: 3,
  industry: 2,
  custom: 1,
};

function detectContentType(promptText: string, brandName: string): ContentStudioType {
  const normalized = promptText.toLowerCase();
  const brandToken = brandName.toLowerCase();

  if (normalized.includes(' vs ') || normalized.includes(' versus ') || normalized.includes(' compare ')) {
    return 'comparison';
  }
  if (normalized.includes('how to') || normalized.includes('steps')) {
    return 'howto';
  }
  if (normalized.includes('what is') || normalized.includes('define')) {
    return 'definition';
  }
  if (normalized.includes('best') || normalized.includes('top')) {
    return 'listicle';
  }
  if (
    normalized.includes('results')
    || normalized.includes('outcome')
    || normalized.includes('success')
    || normalized.includes('case study')
  ) {
    return 'case_study';
  }
  if (brandToken && normalized.includes(brandToken)) {
    return 'faq';
  }
  return 'faq';
}

export async function getContentOpportunities(userId: string, domain: string): Promise<ContentOpportunity[]> {
  const { prompts, latestResults, promptById } = await getPromptContext(userId, domain);
  const brandName = inferBrandName(domain);

  if (prompts.length === 0 || latestResults.length === 0) {
    return [];
  }

  const grouped = new Map<string, typeof latestResults>();
  for (const result of latestResults) {
    const bucket = grouped.get(result.promptId) ?? [];
    bucket.push(result);
    grouped.set(result.promptId, bucket);
  }

  return [...grouped.entries()]
    .map(([promptId, results]) => {
      const prompt = promptById.get(promptId);
      if (!prompt) return null;

      const missingEngines = results
        .filter((result) => !result.mentioned || result.mentionType === 'not_mentioned')
        .map((result) => result.engine);

      const weakEngines = results
        .filter((result) => {
          if (!result.mentioned) return false;
          return result.position === null || result.position > 3;
        })
        .map((result) => result.engine);

      const competitorNames = [...new Set(
        results.flatMap((result) => (result.competitorsJson ?? []).map((competitor) => competitor.name.trim())).filter(Boolean)
      )].slice(0, 6);

      if (missingEngines.length === 0 && weakEngines.length === 0) {
        return null;
      }

      const importance = CATEGORY_WEIGHTS[prompt.category] ?? 1;
      const priorityScore = (missingEngines.length * 12) + (weakEngines.length * 6) + (competitorNames.length * 2) + importance;

      const coverageProblems: string[] = [];
      if (missingEngines.length > 0) {
        coverageProblems.push(`missing on ${missingEngines.length} engine${missingEngines.length === 1 ? '' : 's'}`);
      }
      if (weakEngines.length > 0) {
        coverageProblems.push(`weak positioning on ${weakEngines.length}`);
      }

      return {
        promptId,
        promptText: prompt.promptText,
        category: prompt.category,
        contentType: detectContentType(prompt.promptText, brandName),
        missingEngines,
        weakEngines,
        competitorNames,
        priorityScore,
        reason: coverageProblems.join(' and '),
      } satisfies ContentOpportunity;
    })
    .filter((opportunity): opportunity is ContentOpportunity => Boolean(opportunity))
    .sort((left, right) => right.priorityScore - left.priorityScore || left.promptText.localeCompare(right.promptText));
}
