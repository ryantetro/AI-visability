export interface RecentScanEntry {
  id: string;
  touchedAt: number;
}

const STORAGE_KEY = 'aiso_recent_scans';
const MAX_RECENT = 12;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getRecentScanEntries(): RecentScanEntry[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as RecentScanEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.touchedAt === 'number')
      .sort((a, b) => b.touchedAt - a.touchedAt)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRecentScan(id: string) {
  if (!canUseStorage() || !id) return;

  const nextEntries = [
    { id, touchedAt: Date.now() },
    ...getRecentScanEntries().filter((entry) => entry.id !== id),
  ].slice(0, MAX_RECENT);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  } catch {
    // Ignore storage failures so scan flow never breaks.
  }
}
