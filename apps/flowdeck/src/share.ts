import type { ResultSummary } from "./engine/analytics/result";
import { buildResultSummary } from "./engine/analytics/result";
import type { AiProfile, GameState, PlayerOutcome } from "./engine/types";

export interface SharedResult {
  v: 1;
  seed: number;
  totalDays: number;
  aiProfile: AiProfile;
  generationSwing: number;
  relics?: string[];
  summary: ResultSummary;
}

/** 共有に必要な最小限の結果へ変換する（行動ログや分析の生データは含めない）。 */
export function buildSharedResult(state: GameState): SharedResult | null {
  if (!state.outcome) return null;
  const summary = buildResultSummary(state);
  const players: PlayerOutcome[] = [];
  for (const player of summary.players) {
    const copy: PlayerOutcome = { ...player };
    delete copy.analytics;
    players.push(copy);
  }
  return {
    v: 1,
    seed: state.seed,
    totalDays: state.totalDays,
    aiProfile: state.aiProfile,
    generationSwing: state.generationSwing,
    relics: state.teamRelics ?? [],
    summary: { ...summary, players },
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of stream) {
    chunks.push(chunk);
    total += chunk.length;
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  const gzip = new CompressionStream("gzip");
  const writer = gzip.writable.getWriter();
  const writing = writer.write(toArrayBuffer(bytes)).then(() => writer.close());
  const [, output] = await Promise.all([writing, collect(gzip.readable)]);
  return output;
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  const gzip = new DecompressionStream("gzip");
  const writer = gzip.writable.getWriter();
  const writing = writer.write(toArrayBuffer(bytes)).then(() => writer.close());
  const [, output] = await Promise.all([writing, collect(gzip.readable)]);
  return output;
}

/** 共有コードを作る。gzip が使えない環境では非圧縮 JSON にフォールバックする。 */
export async function encodeSharedResult(result: SharedResult): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(result));
  if (typeof CompressionStream === "undefined") {
    return `j${toBase64Url(bytes)}`;
  }
  return `g${toBase64Url(await compress(bytes))}`;
}

export async function decodeSharedResult(code: string): Promise<SharedResult | null> {
  try {
    const marker = code.charAt(0);
    const payload = fromBase64Url(code.slice(1));
    const bytes = marker === "j" ? payload : await decompress(payload);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SharedResult;
    if (
      parsed?.v !== 1 ||
      typeof parsed.seed !== "number" ||
      typeof parsed.totalDays !== "number" ||
      typeof parsed.summary?.score?.finalScore !== "number"
    ) {
      return null;
    }
    parsed.aiProfile = "standard";
    for (const player of parsed.summary.players) {
      player.weights.prudence ??= 0;
      player.weights.solidarity ??= 0;
      player.weights.appetite ??= 0;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function buildShareUrl(result: SharedResult): Promise<string> {
  const code = await encodeSharedResult(result);
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("r", code);
  return url.toString();
}
