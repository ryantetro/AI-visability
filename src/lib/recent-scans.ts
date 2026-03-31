import { buildScopedStorageKey } from '@/lib/client-storage-scope';

export interface RecentScanEntry {
  id: string;
  touchedAt: number;
}

const STORAGE_KEY = 'aiso_recent_scans';
const MAX_RECENT = 12;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getRecentScanEntries(scopeKey?: string | null): RecentScanEntry[] {
  if (!canUseStorage()) return [];

  try {
    const storageKey = buildScopedStorageKey(STORAGE_KEY, scopeKey);
    if (!storageKey) return [];
    const raw = window.localStorage.getItem(storageKey);
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

export function rememberRecentScan(id: string, scopeKey?: string | null) {
  if (!canUseStorage() || !id) return;

  const storageKey = buildScopedStorageKey(STORAGE_KEY, scopeKey);
  if (!storageKey) return;

  const nextEntries = [
    { id, touchedAt: Date.now() },
    ...getRecentScanEntries(scopeKey).filter((entry) => entry.id !== id),
  ].slice(0, MAX_RECENT);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  } catch {
    // Ignore storage failures so scan flow never breaks.
  }
}
