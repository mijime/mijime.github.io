// Shared word type + parent-voice playback/recording.
//
// Why parent voice? Word learning is "socially gated": for toddlers the voice of
// a familiar caregiver supports attention and retention more than a synthetic
// one (Kuhl, 2007). So each word can be re-recorded by a parent and is stored
// on the device (see db.ts) under the key `<category>/<slug>`.

import { playBlob, speak } from "./audio";
import { cleanClip } from "./clip";
import { db, ready } from "./db";

/** One of a word's photos, as renderable object URLs. */
export type WordPhoto = { id: string; url: string; thumbUrl: string };

export type Word = {
  slug: string;
  label: string;
  reading: string;
  category: string;
  /** emoji icon, when the word has no photo. */
  emoji?: string;
  /** true for a word a parent added; `url`/`thumbUrl` are object URLs for its
   *  photo, kept in IndexedDB (see db.ts / custom.ts). */
  custom?: boolean;
  url?: string;
  thumbUrl?: string;
  /** Every parent photo for this word (the first is `url`/`thumbUrl`). A word
   *  with several is shown with a different one in each quiz round. */
  photos?: WordPhoto[];
};

export async function putVoice(key: string, blob: Blob): Promise<void> {
  await ready;
  await db.voices.put({ key, blob });
}

export async function getVoice(key: string): Promise<Blob | undefined> {
  try {
    await ready;
    const row = await db.voices.get(key);
    return row?.blob;
  } catch {
    return undefined;
  }
}

/** Drop a parent recording (used when a custom word is deleted). */
export async function deleteVoice(key: string): Promise<void> {
  try {
    await ready;
    await db.voices.delete(key);
  } catch {
    /* ignore */
  }
}

/** The keys of every stored recording, for the parent settings list. */
export async function listVoiceKeys(): Promise<string[]> {
  try {
    await ready;
    const rows = await db.voices.toArray();
    return rows.map((r) => r.key);
  } catch {
    return [];
  }
}

export const voiceKey = (w: Word): string => `${w.category}/${w.slug}`;

/** Play the parent's recording if present, otherwise the built-in voice. */
export async function playWord(w: Word): Promise<void> {
  const blob = await getVoice(voiceKey(w));
  if (blob) await playBlob(blob);
  else speak(w.label);
}

let micStream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let stopped: Promise<Blob | null> | null = null;

async function ensureMic(): Promise<boolean> {
  if (micStream) return true;
  try {
    // Let the browser take out steady noise and echo while recording.
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
    });
    return true;
  } catch {
    return false;
  }
}

/** Start recording the mic; false when the mic isn't available. */
export async function startRec(): Promise<boolean> {
  if (!(await ensureMic()) || !micStream) return false;
  chunks = [];
  const r = new MediaRecorder(micStream);
  recorder = r;
  r.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  stopped = new Promise((resolve) => {
    r.onstop = () =>
      resolve(chunks.length > 0 ? new Blob(chunks, { type: r.mimeType || "audio/webm" }) : null);
  });
  r.start();
  return true;
}

/** Stop and resolve the cleaned-up recording (null when nothing was captured). */
export async function stopRec(): Promise<Blob | null> {
  const r = recorder;
  if (!r || r.state === "inactive") return null;
  r.stop();
  const raw = await stopped;
  recorder = null;
  stopped = null;
  if (!raw) return null;
  return cleanClip(raw); // trims silence + de-rumbles; returns raw on failure
}
