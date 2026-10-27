export interface Entry {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: number; // Unix ms
  emoji: string;
  note?: string; // Optional one-line comment
  /** リストの ID。旧データ（v3 以前）はマイグレーションで解決される */
  listId?: number;
  /** note から抽出したハッシュタグ（正規化済み） */
  tags?: string[];
  /** 任意で記録する位置情報 */
  location?: EntryLocation;
}

export interface EntryLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt?: number;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface ExportData {
  entries: Entry[];
  lists: ListDef[];
  version: number;
}

export interface ListDef {
  id?: number;
  name: string;
  color?: string;
  order: number;
}
