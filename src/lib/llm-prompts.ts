import { PrioritizedFix, ScoreResult, WebHealthSummary } from '@/types/score';

export interface ReportPromptBundle {
  fullPrompt: string;
  remainingFixesPrompt: string;
  fixPrompts: Array<{
    checkId: string;
    label: string;
    prompt: string;
  }>;
}

export function buildReportPromptBundle(url: string, score: ScoreResult): ReportPromptBundle {
  return {
    fullPrompt: buildFullReportPrompt(url, score),
    remainingFixesPrompt: buildRemainingFixesPrompt(url, score),
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
        .map((fix, index) => `${index + 1}. [${fix.category.toUpperCase()}] ${fix.label} (+${fix.estimatedLift})\n   Finding: ${fix.detail}\n   Current: ${fix.actualValue || 'Not provided'}\n   Expected: ${fix.expectedValue || 'Resolve the failed check'}\n   Goal: ${fix.instruction}`)
        .join('\n')
    : 'No blocking fixes were identified.';

  return `You are helping improve the website at ${url} based on an AISO audit.\n\nCurrent AI Visibility score: ${score.scores.aiVisibility}/100 (${score.bandInfo.label})\nCurrent Web Health score: ${score.scores.webHealth ?? 'Pending'}/100\nCurrent Overall score: ${score.scores.overall ?? 'Pending'}/100\nPotential lift remaining: ${score.scores.potentialLift ?? 'Pending'} points\n\nAI Visibility breakdown:\n${aiSummary}\n\nWeb Health summary:\n${webSummary}\n\nPriority fixes:\n${fixSummary}\n\nFor each fix, provide:\n1. The exact code or configuration change to make\n2. Where it should be added\n3. A concise explanation of why it matters\n4. How to verify the fix after deployment\n\nKeep the recommendations practical for a small business website team.`;
}

export function buildFixPrompt(url: string, fix: PrioritizedFix): string {
  return `Help implement this ${fix.category} website improvement for ${url}.\n\nIssue: ${fix.label}\nCategory: ${fix.category}\nPotential lift: +${fix.estimatedLift} points\nEffort band: ${fix.effortBand}\nAudit finding: ${fix.detail}\nCurrent value: ${fix.actualValue || 'Not provided'}\nExpected value: ${fix.expectedValue || 'Resolve the failed audit check'}\nDesired change: ${fix.instruction}\n\nPlease return:\n1. The exact code or config update\n2. Where it belongs in the codebase or CMS\n3. Any assumptions you had to make\n4. A short verification checklist`;
}

export function buildRemainingFixesPrompt(url: string, score: ScoreResult): string {
  const remaining = score.fixes
    .map((fix, index) => `${index + 1}. ${fix.label} [${fix.category}] (+${fix.estimatedLift}, ${fix.effortBand})`)
    .join('\n');

  return `You are acting as an implementation copilot for ${url}.\n\nCurrent Overall score: ${score.scores.overall ?? 'Pending'}/100\nAI Visibility score: ${score.scores.aiVisibility}/100\nWeb Health score: ${score.scores.webHealth ?? 'Pending'}/100\n\nRemaining fixes:\n${remaining || 'No remaining fixes'}\n\nReturn a prioritized action plan with:\n1. Quick wins first\n2. Exact code or configuration updates where possible\n3. A recommended implementation order for one developer\n4. Verification steps after each change`;
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
