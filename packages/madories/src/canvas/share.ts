import { dslToFloor, floorToDsl } from "./dsl";
import type { FloorPlan } from "../types";

const SEPARATOR = "\n---\n";

function floorsToText(floors: FloorPlan[]): string {
  return floors.map(floorToDsl).join(SEPARATOR);
}

function textToFloors(text: string): FloorPlan[] {
  return text.split(SEPARATOR).map(dslToFloor);
}

async function compress(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const compressed = await new Response(stream.readable).arrayBuffer();
  const binary = String.fromCharCode(...new Uint8Array(compressed));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function decompress(encoded: string): Promise<string> {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(pad));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const decompressed = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(decompressed);
}

export async function encodeFloors(floors: FloorPlan[]): Promise<string> {
  return compress(floorsToText(floors));
}

export async function decodeFloors(encoded: string): Promise<FloorPlan[]> {
  const text = await decompress(encoded);
  return textToFloors(text);
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
