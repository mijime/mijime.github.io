import { dslToFloor, floorToDsl } from "./dsl";
import type { FloorPlan } from "../types";

const SEPARATOR = "\n---\n";

function floorsToText(floors: FloorPlan[]): string {
  return floors.map((x) => floorToDsl(x)).join(SEPARATOR);
}

function textToFloors(text: string): FloorPlan[] {
  return text.split(SEPARATOR).map((x) => dslToFloor(x));
}

function compress(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(stream.readable).arrayBuffer().then((compressed) => {
    const binary = String.fromCodePoint(...new Uint8Array(compressed));
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  });
}

function decompress(encoded: string): Promise<string> {
  const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const pad = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(pad));
  const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0)!);
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(stream.readable)
    .arrayBuffer()
    .then((decompressed) => new TextDecoder().decode(decompressed));
}

export function encodeFloors(floors: FloorPlan[]): Promise<string> {
  return compress(floorsToText(floors));
}

export function decodeFloors(encoded: string): Promise<FloorPlan[]> {
  return decompress(encoded).then((text) => textToFloors(text));
}

export function buildShareUrl(encoded: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("d", encoded);
  return url.toString();
}

export function getShareParam(): string | null {
  return new URLSearchParams(window.location.search).get("d");
}
