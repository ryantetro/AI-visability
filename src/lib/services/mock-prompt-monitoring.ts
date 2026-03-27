import type { PromptMonitoringService, MonitoredPrompt, PromptResult, CompetitorAppearance, CompetitorSummary } from '@/types/services';
import type { AIEngine } from '@/types/ai-mentions';
import { randomUUID } from 'crypto';

const prompts = new Map<string, MonitoredPrompt>();
const results: PromptResult[] = [];
const competitorAppearances: CompetitorAppearance[] = [];

export const mockPromptMonitoring: PromptMonitoringService = {
  async listPrompts(domain, userId?) {
    return [...prompts.values()].filter((p) => p.domain === domain && (!userId || p.userId === userId));
  },

  async createPrompt(prompt) {
    const now = new Date().toISOString();
    const record: MonitoredPrompt = {
      id: randomUUID(),
      ...prompt,
      createdAt: now,
      updatedAt: now,
    };
    prompts.set(record.id, record);
    return record;
  },

  async updatePrompt(id, updates, userId?) {
    const existing = prompts.get(id);
    if (!existing) throw new Error('Prompt not found');
    if (userId && existing.userId !== userId) throw new Error('Forbidden');
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    prompts.set(id, updated as MonitoredPrompt);
  },

  async deletePrompt(id, userId?) {
    const existing = prompts.get(id);
    if (userId && (!existing || existing.userId !== userId)) throw new Error('Forbidden');
    prompts.delete(id);
  },

  async savePromptResult(result) {
    results.push({
      ...result,
      id: randomUUID(),
      mentionType: result.mentionType ?? (result.mentioned ? 'direct' : 'not_mentioned'),
      positionContext: result.positionContext ?? null,
      sentimentLabel: result.sentimentLabel ?? null,
      sentimentStrength: result.sentimentStrength ?? null,
      sentimentReasoning: result.sentimentReasoning ?? null,
      keyQuote: result.keyQuote ?? null,
      descriptionAccuracy: result.descriptionAccuracy ?? null,
      analysisSource: result.analysisSource ?? 'heuristic',
      competitorsJson: result.competitorsJson ?? null,
      monitoringRunId: result.monitoringRunId ?? null,
      runWeightedScore: result.runWeightedScore ?? null,
      runScoreDelta: result.runScoreDelta ?? null,
      notableScoreChange: result.notableScoreChange ?? false,
    });
  },

  async listPromptResults(domain, limit = 100, userId?) {
    const allowedPromptIds = userId
      ? new Set([...prompts.values()].filter((p) => p.userId === userId).map((p) => p.id))
      : null;
    return results
      .filter((r) => r.domain === domain && (!allowedPromptIds || allowedPromptIds.has(r.promptId)))
      .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())
      .slice(0, limit);
  },

  async listResultsByPrompt(promptId, limit = 30) {
    return results
      .filter((r) => r.promptId === promptId)
      .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())
      .slice(0, limit);
  },

  async listActiveDomainsWithPrompts() {
    const domains = new Set<string>();
    for (const p of prompts.values()) {
      if (p.active) domains.add(p.domain);
    }
    return [...domains];
  },

  async saveCompetitorAppearance(appearance) {
    competitorAppearances.push({
      ...appearance,
      id: randomUUID(),
      previousPosition: appearance.previousPosition ?? null,
      movementDelta: appearance.movementDelta ?? null,
      isNewCompetitor: appearance.isNewCompetitor ?? false,
      detectedAt: new Date().toISOString(),
    });
  },

  async listCompetitorSummaries(domain, days = 30): Promise<CompetitorSummary[]> {
    const cutoff = Date.now() - days * 86400000;
    const relevant = competitorAppearances.filter(
      (a) => a.domain === domain && new Date(a.detectedAt).getTime() >= cutoff
    );

    const map = new Map<string, { appearances: number; positions: number[]; engines: Set<AIEngine>; coMentioned: number }>();
    for (const a of relevant) {
      const existing = map.get(a.competitor);
      if (existing) {
        existing.appearances++;
        if (a.position !== null) existing.positions.push(a.position);
        existing.engines.add(a.engine);
        if (a.coMentioned) existing.coMentioned++;
      } else {
        map.set(a.competitor, {
          appearances: 1,
          positions: a.position !== null ? [a.position] : [],
          engines: new Set([a.engine]),
          coMentioned: a.coMentioned ? 1 : 0,
        });
      }
    }

    return Array.from(map.entries())
      .map(([competitor, data]) => ({
        competitor,
        appearances: data.appearances,
        avgPosition: data.positions.length > 0
          ? Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10
          : null,
        engines: [...data.engines],
        coMentionedCount: data.coMentioned,
      }))
      .sort((a, b) => b.appearances - a.appearances);
  },
};
