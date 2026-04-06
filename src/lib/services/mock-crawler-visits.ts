import type { CrawlerVisitService, CrawlerVisit, CrawlerVisitSummary } from '@/types/services';
import { randomUUID } from 'crypto';

const visits: CrawlerVisit[] = [];

export function resetMockCrawlerVisits() {
  visits.length = 0;
}

export const mockCrawlerVisits: CrawlerVisitService = {
  async logVisit(visit) {
    visits.push({
      id: randomUUID(),
      ...visit,
      visitedAt: new Date().toISOString(),
    });
  },

  async listVisits(domain, days = 30) {
    const cutoff = Date.now() - days * 86400000;
    return visits
      .filter((v) => v.domain === domain && new Date(v.visitedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
  },

  async countVisits(domain, days = 30) {
    const cutoff = Date.now() - days * 86400000;
    return visits.filter((v) => v.domain === domain && new Date(v.visitedAt).getTime() >= cutoff).length;
  },

  async listVisitSummaries(domain, days = 30): Promise<CrawlerVisitSummary[]> {
    const cutoff = Date.now() - days * 86400000;
    const relevant = visits.filter(
      (v) => v.domain === domain && new Date(v.visitedAt).getTime() >= cutoff
    );

    const map = new Map<string, { category: string; count: number; paths: Set<string>; lastSeen: string }>();
    for (const v of relevant) {
      const existing = map.get(v.botName);
      if (existing) {
        existing.count++;
        existing.paths.add(v.pagePath);
        if (v.visitedAt > existing.lastSeen) existing.lastSeen = v.visitedAt;
      } else {
        map.set(v.botName, {
          category: v.botCategory,
          count: 1,
          paths: new Set([v.pagePath]),
          lastSeen: v.visitedAt,
        });
      }
    }

    return Array.from(map.entries())
      .map(([botName, data]) => ({
        botName,
        botCategory: data.category,
        visitCount: data.count,
        uniquePaths: data.paths.size,
        lastSeen: data.lastSeen,
      }))
      .sort((a, b) => b.visitCount - a.visitCount);
  },
};
