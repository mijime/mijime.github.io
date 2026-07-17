export interface Entry {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: number; // unix ms
  emoji: string;
  note?: string; // optional one-line comment
  list?: string; // list/category name
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
