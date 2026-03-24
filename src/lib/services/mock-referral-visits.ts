import type { ReferralVisitService, ReferralVisit } from '@/types/services';
import { randomUUID } from 'crypto';

const visits: ReferralVisit[] = [];

export const mockReferralVisits: ReferralVisitService = {
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
};
