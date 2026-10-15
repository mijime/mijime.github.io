// Sound: WebAudio toy synthesizer + Formant character voice babble + Japanese TTS + parent recordings.

import type { FriendKind } from "./character";

let AC: AudioContext | null = null;
let master: GainNode | null = null;
let voiceGain: GainNode | null = null;
let muted = false;
let voices: SpeechSynthesisVoice[] = [];
let activeChar: FriendKind = "bear";

// Per-character voice profiles (TTS pitch/rate + WebAudio formant base pitch)
const CHAR_VOICES: Record<
  FriendKind,
  { pitch: number; rate: number; f0: number; formantShift: number; bend: number }
> = {
  bear: { pitch: 0.84, rate: 0.91, f0: 210, formantShift: 0.9, bend: 1.08 },
  bunny: { pitch: 1.42, rate: 1.04, f0: 390, formantShift: 1.25, bend: 1.22 },
  panda: { pitch: 1.12, rate: 0.93, f0: 285, formantShift: 1.05, bend: 1.12 },
  frog: { pitch: 1.28, rate: 1.0, f0: 330, formantShift: 1.15, bend: 1.35 },
};

// Japanese 5-vowel formant frequencies [F1, F2] in Hz
const VOWEL_FORMANTS: Record<"a" | "i" | "u" | "e" | "o", [number, number]> = {
  a: [780, 1280],
  i: [310, 2350],
  u: [350, 1150],
  e: [510, 1950],
  o: [490, 920],
};

// C major pentatonic across two octaves — every note sounds harmonious together.
const PENTATONIC = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export function setVoiceChar(kind: FriendKind): void {
  activeChar = kind;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem("otete-muted", m ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (m) {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function initMuted(): void {
  try {
    if (localStorage.getItem("otete-muted") === "1") muted = true;
  } catch {
    /* ignore */
  }
}

function loadVoices(): void {
  try {
    voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  } catch {
    voices = [];
  }
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

/** Must be called from a user gesture (first tap) to start audio + speech. */
export function unlockAudio(): void {
  if (!AC) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      AC = new Ctor();
      master = AC.createGain();
      master.gain.value = 0.32;
      master.connect(AC.destination);
      voiceGain = AC.createGain();
      voiceGain.gain.value = 1;
      voiceGain.connect(AC.destination);
    }
  }
  if (AC && AC.state === "suspended") void AC.resume();
  if (window.speechSynthesis) loadVoices();
}

export function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.4,
  slideTo?: number,
): void {
  if (!AC || !master || muted) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, freq), t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Warm wooden marimba / xylophone note on a pentatonic scale. */
export function marimba(step = 0, vol = 0.45): void {
  if (!AC || !master || muted) return;
  const idx = ((Math.round(step) % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length;
  const f = PENTATONIC[idx]!;
  tone(f, 0.32, "sine", vol);
  tone(f * 4, 0.06, "triangle", vol * 0.22);
  tone(f * 2, 0.14, "sine", vol * 0.12);
}

export function plink(semi = 12, vol = 0.4): void {
  const f = 392 * 2 ** (semi / 12);
  tone(f, 0.3, "triangle", vol);
  tone(f * 2, 0.14, "sine", vol * 0.3);
}

/** Joyful xylophone fanfare for celebrations. */
export function cheer(): void {
  const notes = [0, 2, 4, 5, 7];
  notes.forEach((n, i) => setTimeout(() => marimba(n + 2, 0.48), i * 75));
}

/** Bouncy rubber / spring "boing!" sound (never a harsh error buzzer). */
export function boing(pitch = 1): void {
  if (!AC || !master || muted) return;
  const base = 240 * pitch;
  tone(base, 0.22, "sine", 0.42, base * 1.9);
  setTimeout(() => tone(base * 1.3, 0.16, "triangle", 0.25, base * 1.7), 45);
}

/** Cute "pakku! / mogumogu" bite sound when feeding a character. */
export function chomp(): void {
  if (!AC || !master || muted) return;
  tone(320, 0.09, "triangle", 0.5, 140);
  setTimeout(() => tone(420, 0.11, "sine", 0.45, 220), 95);
  setTimeout(() => marimba(5, 0.4), 200);
}

/** Juicy soap-bubble pop ("pachin!"). */
export function bubblePop(pitch = 1): void {
  if (!AC || !master || muted) return;
  const f = (480 + Math.random() * 260) * pitch;
  tone(f, 0.08, "sine", 0.42, f * 2.2);
}

/** Satisfying wooden "supo! / kapo!" when a puzzle piece snaps into its slot. */
export function snapIn(step = 0): void {
  if (!AC || !master || muted) return;
  tone(220, 0.06, "sine", 0.45, 580);
  setTimeout(() => marimba(4 + (step % 5), 0.5), 45);
}

/** Cheerful train whistle ("poppo-!"). */
export function chooChoo(): void {
  if (!AC || !master || muted) return;
  tone(587.33, 0.18, "triangle", 0.36);
  tone(783.99, 0.18, "triangle", 0.32);
  setTimeout(() => {
    tone(587.33, 0.28, "triangle", 0.38);
    tone(783.99, 0.28, "triangle", 0.34);
  }, 210);
}

/** Maps a Japanese kana character to its underlying vowel ('a'|'i'|'u'|'e'|'o'). */
function kanaToVowel(ch: string): "a" | "i" | "u" | "e" | "o" | null {
  const code = ch.codePointAt(0) ?? 0;
  // Normalize katakana to hiragana range
  const h = code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
  if ("あかさたなはまやらわがざだばぱぁゃわ".includes(h)) return "a";
  if ("いきしちにひみりぎじぢびぴぃ".includes(h)) return "i";
  if ("うくすつぬふむゆるぐずづぶぷぅゅっん".includes(h)) return "u";
  if ("えけせてねへめれげぜでべぺぇ".includes(h)) return "e";
  if ("おこそとのほもよろをごぞどぼぽぉょ".includes(h)) return "o";
  return null;
}

/**
 * Plays a cute Animalese / formant-filtered vocal babble ("ピポパポ♪") matching
 * the first vowels of `text` in the active animal friend's voice!
 */
function playFormantBabble(text: string): void {
  if (!AC || !master || muted) return;
  const profile = CHAR_VOICES[activeChar];
  const vowels: ("a" | "i" | "u" | "e" | "o")[] = [];
  for (const ch of text) {
    const v = kanaToVowel(ch);
    if (v) vowels.push(v);
    if (vowels.length >= 5) break;
  }
  if (vowels.length === 0) return;

  const now = AC.currentTime;
  const stepDur = 0.055;
  vowels.forEach((v, idx) => {
    if (!AC || !master) return;
    const t0 = now + idx * stepDur;
    const [f1, f2] = VOWEL_FORMANTS[v];
    // Pitch contour rises slightly on each syllable for a cheerful parentese lilt
    const f0 = profile.f0 * (0.94 + (idx % 3) * 0.07 + Math.random() * 0.06);

    const osc = AC.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f0 * profile.bend, t0 + stepDur * 0.85);

    const bp1 = AC.createBiquadFilter();
    bp1.type = "bandpass";
    bp1.frequency.setValueAtTime(f1 * profile.formantShift, t0);
    bp1.Q.value = 4.5;

    const bp2 = AC.createBiquadFilter();
    bp2.type = "bandpass";
    bp2.frequency.setValueAtTime(f2 * profile.formantShift, t0);
    bp2.Q.value = 5.5;

    const env = AC.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + stepDur * 0.92);

    osc.connect(bp1);
    osc.connect(bp2);
    bp1.connect(env);
    bp2.connect(env);
    env.connect(master);

    osc.start(t0);
    osc.stop(t0 + stepDur);
  });
}

export function speak(text: string): void {
  if (muted) return;
  playFormantBabble(text);
  if (!window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const profile = CHAR_VOICES[activeChar];
    const excited = text.includes("！") || text.includes("？");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = profile.rate * (excited ? 1.03 : 1);
    u.pitch = Math.min(2, profile.pitch * (excited ? 1.06 : 1));
    u.volume = 1;
    const v = voices.find((vo) => (vo.lang || "").toLowerCase().startsWith("ja"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

/** Play a recorded voice clip through the master/voice gain node. */
export async function playBlob(blob: Blob): Promise<void> {
  if (muted) return;
  try {
    if (!AC) unlockAudio();
    if (AC && (voiceGain || master)) {
      if (AC.state === "suspended") await AC.resume();
      const audio = await AC.decodeAudioData(await blob.arrayBuffer());
      const src = AC.createBufferSource();
      src.buffer = audio;
      src.connect(voiceGain ?? master!);
      src.start();
      return;
    }
  } catch {
    /* fall through */
  }
  if (muted) return;
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.onended = () => URL.revokeObjectURL(url);
  void a.play().catch(() => {});
}

export function soundIcon(): string {
  return muted ? "🔇" : "🔊";
}
