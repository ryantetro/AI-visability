import { DatabaseService } from '@/types/services';
import { ScanJob } from '@/types/scan';

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
    const now = Date.now();
    for (const scan of getStore().values()) {
      if (
        scan.normalizedUrl === normalizedUrl &&
        scan.status === 'complete' &&
        now - scan.createdAt < maxAgeMs
      ) {
        return scan;
      }
    }
    return null;
  },
};
