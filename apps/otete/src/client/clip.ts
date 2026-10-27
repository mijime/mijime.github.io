// Clean up a recorded word before it is stored.
//
// Speech only, so we decode the clip, cut the silence around the word, take out
// the low rumble with a high-pass, and re-encode as a small mono 16 kHz WAV.
// (The browser's own noiseSuppression/echoCancellation do the heavy noise
// removal at capture time — see voice.ts.)

const TARGET_RATE = 16_000; // speech: 16 kHz mono is plenty
const SILENCE_DB = -45; // below this a 10 ms window counts as silence
const PAD = 0.12; // seconds of silence kept at each end
const MIN_SECONDS = 0.15; // shorter than this isn't a word; keep the original

/** Trim silence + de-rumble a clip. Returns the original on any failure. */
export async function cleanClip(blob: Blob): Promise<Blob> {
  try {
    const data = await blob.arrayBuffer();
    const decode = new OfflineAudioContext(1, 1, 48_000);
    const decoded = await decode.decodeAudioData(data);
    const range = trimRange(decoded);
    if (!range) return blob;

    const duration = (range.end - range.start) / decoded.sampleRate;
    const frames = Math.max(1, Math.round(duration * TARGET_RATE));
    const ctx = new OfflineAudioContext(1, frames, TARGET_RATE);
    const src = ctx.createBufferSource();
    src.buffer = decoded;
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 90; // below a child's voice; kills rumble/hum
    highpass.Q.value = 0.7;
    src.connect(highpass);
    highpass.connect(ctx.destination);
    src.start(0, range.start / decoded.sampleRate, duration);
    const rendered = await ctx.startRendering();
    return encodeWav(rendered, normalizeGain(rendered));
  } catch {
    return blob;
  }
}

/** First and last sample above the noise floor (with a little padding), or null
 *  when the whole clip is silence. */
function trimRange(buffer: AudioBuffer): { start: number; end: number } | null {
  const rate = buffer.sampleRate;
  const win = Math.max(1, Math.round(rate * 0.01)); // 10 ms
  const threshold = 10 ** (SILENCE_DB / 20);
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));

  const loud: boolean[] = [];
  for (let i = 0; i < buffer.length; i += win) {
    const end = Math.min(buffer.length, i + win);
    let sum = 0;
    for (const d of channels) {
      for (let j = i; j < end; j++) {
        const v = d[j]!;
        sum += v * v;
      }
    }
    loud.push(Math.sqrt(sum / ((end - i) * channels.length)) > threshold);
  }

  let first = -1;
  let last = -1;
  for (let w = 0; w < loud.length; w++) {
    if (loud[w]) {
      if (first < 0) first = w;
      last = w;
    }
  }
  if (first < 0) return null;

  const pad = Math.round(PAD * rate);
  const start = Math.max(0, first * win - pad);
  const end = Math.min(buffer.length, (last + 1) * win + pad);
  if (end - start < rate * MIN_SECONDS) return null;
  return { start, end };
}

/** Gain that brings a quiet clip up to a comfortable peak, capped so we don't
 *  amplify the noise floor (at most ~+9.5 dB). */
function normalizeGain(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (const sample of data) {
    const a = Math.abs(sample);
    if (a > peak) peak = a;
  }
  return peak < 0.001 ? 1 : Math.min(0.9 / peak, 3);
}

/** 16-bit PCM mono WAV. */
function encodeWav(buffer: AudioBuffer, gain = 1): Blob {
  const data = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const ab = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(ab);
  const str = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.codePointAt(i) ?? 0);
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + data.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  str(36, "data");
  view.setUint32(40, data.length * 2, true);
  let off = 44;
  for (const sample of data) {
    const s = Math.max(-1, Math.min(1, sample * gain));
    view.setInt16(off, s < 0 ? s * 0x80_00 : s * 0x7f_ff, true);
    off += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}
