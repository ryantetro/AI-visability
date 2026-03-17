import { MONITORED_DOMAINS_KEY, HIDDEN_DOMAINS_KEY } from './constants';

export function loadStoredDomains(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MONITORED_DOMAINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function saveStoredDomains(domains: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MONITORED_DOMAINS_KEY, JSON.stringify(domains));
}

export function loadHiddenDomains(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_DOMAINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function saveHiddenDomains(domains: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HIDDEN_DOMAINS_KEY, JSON.stringify(domains));
}

export function loadStoredBoolean(key: string) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === 'true';
}

export function saveStoredBoolean(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value ? 'true' : 'false');
}
