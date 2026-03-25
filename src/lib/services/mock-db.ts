import { DatabaseService } from '@/types/services';
import { ScanJob } from '@/types/scan';
import { getDomain } from '@/lib/url-utils';

// Use globalThis to survive HMR in development
const globalStore = globalThis as unknown as {
  __aisoScans?: Map<string, ScanJob>;
};

function getStore(): Map<string, ScanJob> {
  if (!globalStore.__aisoScans) {
    globalStore.__aisoScans = new Map();
  }
  return globalStore.__aisoScans;
}

export function resetMockDb() {
  getStore().clear();
}

export const mockDb: DatabaseService = {
  async getScan(id: string) {
    return getStore().get(id) ?? null;
  },

  async saveScan(scan: ScanJob) {
    getStore().set(scan.id, scan);
  },

  async findScanByUrl(normalizedUrl: string, maxAgeMs = 24 * 60 * 60 * 1000) {
    const matches = [...getStore().values()]
      .filter(scan =>
        scan.normalizedUrl === normalizedUrl &&
        scan.status === 'complete' &&
        Date.now() - scan.createdAt < maxAgeMs
      )
      .sort((a, b) => b.createdAt - a.createdAt);
    return matches[0] ?? null;
  },

  async listCompletedScans(limit = 50, email?: string) {
    return [...getStore().values()]
      .filter((scan) => scan.status === 'complete' && (!email || scan.email === email))
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
      .slice(0, limit);
  },

  async findLatestScanByDomain(domain: string, email?: string) {
    const normalizedDomain = domain.toLowerCase();
    return (
      [...getStore().values()]
        .filter((scan) => scan.status === 'complete' && getDomain(scan.url) === normalizedDomain && (!email || scan.email === email))
        .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))[0] ?? null
    );
  },
};
