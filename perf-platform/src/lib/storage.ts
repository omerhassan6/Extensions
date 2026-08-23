import { HistoryEntry } from "./types";

const KEY = "perf-platform:history";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry) {
  if (typeof window === "undefined") return;
  const all = loadHistory();
  all.unshift(entry);
  window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 100)));
}

export function deleteHistoryEntry(id: string) {
  if (typeof window === "undefined") return;
  const all = loadHistory().filter((e) => e.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return loadHistory().find((e) => e.id === id);
}

const DRAFT_KEY = "perf-platform:draft-config";

export function setDraftConfig(config: HistoryEntry["config"]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(config));
}

export function consumeDraftConfig(): HistoryEntry["config"] | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(DRAFT_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
