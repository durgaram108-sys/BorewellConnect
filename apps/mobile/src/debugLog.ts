import AsyncStorage from "@react-native-async-storage/async-storage";

export type LogLevel = "info" | "error";

export interface LogEntry {
  ts: number;
  level: LogLevel;
  message: string;
  detail?: string;
}

const STORAGE_KEY = "debug_log_v1";
const MAX_ENTRIES = 200;

let entries: LogEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // best-effort — logging must never throw
  }
}

export async function loadDebugLog() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) entries = JSON.parse(raw);
  } catch {
    entries = [];
  }
  listeners.forEach((l) => l());
}

export function logEvent(level: LogLevel, message: string, detail?: unknown) {
  entries = [
    {
      ts: Date.now(),
      level,
      message,
      detail: detail instanceof Error ? detail.message : detail !== undefined ? String(detail) : undefined,
    },
    ...entries,
  ].slice(0, MAX_ENTRIES);
  listeners.forEach((l) => l());
  persist();
}

export function getDebugLog(): LogEntry[] {
  return entries;
}

export function clearDebugLog() {
  entries = [];
  listeners.forEach((l) => l());
  persist();
}

export function subscribeDebugLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
