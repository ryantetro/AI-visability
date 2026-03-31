import { MONITORED_DOMAINS_KEY, HIDDEN_DOMAINS_KEY } from './constants';
import { buildScopedStorageKey } from '@/lib/client-storage-scope';

export function loadStoredDomains(scopeKey?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const storageKey = buildScopedStorageKey(MONITORED_DOMAINS_KEY, scopeKey);
    if (!storageKey) return [];
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function saveStoredDomains(domains: string[], scopeKey?: string | null) {
  if (typeof window === 'undefined') return;
  const storageKey = buildScopedStorageKey(MONITORED_DOMAINS_KEY, scopeKey);
  if (!storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(domains));
}

export function loadHiddenDomains(scopeKey?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const storageKey = buildScopedStorageKey(HIDDEN_DOMAINS_KEY, scopeKey);
    if (!storageKey) return [];
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function saveHiddenDomains(domains: string[], scopeKey?: string | null) {
  if (typeof window === 'undefined') return;
  const storageKey = buildScopedStorageKey(HIDDEN_DOMAINS_KEY, scopeKey);
  if (!storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(domains));
}

export function loadStoredBoolean(key: string) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === 'true';
}

export function saveStoredBoolean(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value ? 'true' : 'false');
}
