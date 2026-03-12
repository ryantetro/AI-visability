import { PrioritizedFix, ScoreResult, WebHealthSummary } from '@/types/score';

export interface ReportPromptBundle {
  reportPrompt: string;
  fixPrompts: Array<{
    checkId: string;
    label: string;
    prompt: string;
  }>;
}

export function buildReportPromptBundle(url: string, score: ScoreResult): ReportPromptBundle {
  return {
    reportPrompt: buildFullReportPrompt(url, score),
    fixPrompts: score.fixes.map((fix) => ({
      checkId: fix.checkId,
      label: fix.label,
      prompt: fix.copyPrompt,
    })),
  };
}

export function buildFullReportPrompt(url: string, score: ScoreResult): string {
  const aiSummary = score.dimensions
    .map((dimension) => `- ${dimension.label}: ${dimension.percentage}% (${dimension.score}/${dimension.maxScore})`)
    .join('\n');

  const webSummary = score.webHealth ? buildWebHealthSummary(score.webHealth) : '- Web Health: still processing or unavailable';
  const fixSummary = score.fixes.length > 0
    ? score.fixes
        .slice(0, 10)
        .map((fix, index) => `${index + 1}. [${fix.category.toUpperCase()}] ${fix.label} (+${fix.estimatedLift})\n   Finding: ${fix.detail}\n   Goal: ${fix.instruction}`)
        .join('\n')
    : 'No blocking fixes were identified.';

  return `You are helping improve the website at ${url} based on an AISO audit.\n\nCurrent AI Visibility score: ${score.percentage}/100 (${score.bandInfo.label})\n\nAI Visibility breakdown:\n${aiSummary}\n\nWeb Health summary:\n${webSummary}\n\nPriority fixes:\n${fixSummary}\n\nFor each fix, provide:\n1. The exact code or configuration change to make\n2. Where it should be added\n3. A concise explanation of why it matters\n4. How to verify the fix after deployment\n\nKeep the recommendations practical for a small business website team.`;
}

export function buildFixPrompt(url: string, fix: PrioritizedFix): string {
  return `Help implement this ${fix.category} website improvement for ${url}.\n\nIssue: ${fix.label}\nCategory: ${fix.category}\nPotential lift: +${fix.estimatedLift} points\nAudit finding: ${fix.detail}\nDesired change: ${fix.instruction}\n\nPlease return:\n1. The exact code or config update\n2. Where it belongs in the codebase or CMS\n3. Any assumptions you had to make\n4. A short verification checklist`;
}

function buildWebHealthSummary(webHealth: WebHealthSummary): string {
  if (webHealth.status !== 'complete') {
    return '- Web Health: unavailable';
  }

  const pillars = webHealth.pillars
    .map((pillar) => `- ${pillar.label}: ${pillar.percentage ?? 'Unavailable'}% (${pillar.score}/${pillar.maxScore})`)
    .join('\n');

  return `${pillars}\n- Source: ${webHealth.source || 'heuristic'}`;
}
