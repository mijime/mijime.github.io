import { useSyncExternalStore } from "react";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

const MAX_ENTRIES = 300;
let entries: LogEntry[] = [];
const listeners = new Set<() => void>();

function emit(entry: LogEntry): void {
  entries = [...entries.slice(-MAX_ENTRIES + 1), entry];
  for (const l of listeners) {
    l();
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function stamp(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function logInfo(message: string): void {
  emit({ level: "info", message, time: stamp() });
}

export function logWarn(message: string): void {
  emit({ level: "warn", message, time: stamp() });
}

export function logError(message: string): void {
  emit({ level: "error", message, time: stamp() });
}

export function clearLogs(): void {
  entries = [];
  for (const l of listeners) {
    l();
  }
}

export function downloadLogs(): void {
  const text = entries.map((e) => `[${e.time}] ${e.level.toUpperCase()} ${e.message}`).join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "madories-log.txt";
  a.click();
  URL.revokeObjectURL(url);
}

let installed = false;

/** Captures window errors / unhandled rejections into the log buffer. Idempotent. */
export function installLogHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;
  window.addEventListener("error", (e) => {
    logError(e.message || "unknown error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    logError(String(e.reason ?? "unhandled rejection").slice(0, 300));
  });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useLogs(): LogEntry[] {
  return useSyncExternalStore(subscribe, () => entries);
}
