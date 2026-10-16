// The one recording UI: a small dialog that plays the current clip and records
// a new one (up to 5s). `recordVoice` returns the cleaned clip so the form that
// created a word can hold it; `openVoiceRecorder` saves it over an existing key.

import { plink, playBlob } from "./audio";
import { getVoice, putVoice, startRec, stopRec } from "./voice";
import { tap } from "./ui";
import { makeOverlay, dropOverlay } from "./overlay";

const MAX_MS = 5000; // recordings are a single word; 5s is plenty

export type RecordOptions = {
  label: string;
  /** the clip in use now, played back before recording over it. */
  current?: Blob | null;
  title?: string;
};

/** Resolves the new recording, or null if the parent backs out. */
export function recordVoice(opts: RecordOptions): Promise<Blob | null> {
  const current = opts.current ?? null;
  return new Promise((resolve) => {
    const ov = makeOverlay();
    ov.innerHTML = `<div class="sheet">
      <h3>${opts.title ?? "こえを なおす"}</h3>
      <p class="sheet-sub">${opts.label}</p>
      <div class="aw-voice">
        <button class="ws-mic" id="vr-rec" type="button">🎤 こえで とうろく</button>
        <button class="ws-mic" id="vr-play" type="button"${current ? "" : " hidden"}>▶ いまの こえ</button>
        <span class="aw-limit" id="vr-limit"></span>
      </div>
      <div class="sheet-actions">
        <button class="pill" id="vr-close" type="button">とじる</button>
      </div>
      <p class="sheet-note" id="vr-note"></p>
    </div>`;

    const recBtn = ov.querySelector<HTMLElement>("#vr-rec")!;
    const playBtn = ov.querySelector<HTMLElement>("#vr-play")!;
    const limitEl = ov.querySelector<HTMLElement>("#vr-limit")!;
    const noteEl = ov.querySelector<HTMLElement>("#vr-note")!;
    const note = (s: string): void => {
      noteEl.textContent = s;
    };

    let recording = false;
    let tick: number | null = null;
    let autoStop: number | null = null;

    const clearTimers = (): void => {
      if (tick !== null) {
        window.clearInterval(tick);
        tick = null;
      }
      if (autoStop !== null) {
        window.clearTimeout(autoStop);
        autoStop = null;
      }
    };

    const stop = (): void => {
      if (!recording) return;
      recording = false;
      clearTimers();
      recBtn.classList.remove("rec");
      recBtn.textContent = "🎤 こえで とうろく";
      limitEl.textContent = "";
      note("こえを ととのえています…");
      void stopRec().then((blob) => {
        if (!blob) {
          note("ろくおん できなかった");
          return;
        }
        dropOverlay(ov);
        resolve(blob);
      });
    };

    const cancel = (): void => {
      if (recording) {
        void stopRec();
        recording = false;
      }
      clearTimers();
      dropOverlay(ov);
      resolve(null);
    };

    tap(recBtn, () => {
      if (recording) {
        stop();
        return;
      }
      void (async () => {
        if (!(await startRec())) {
          note("マイクが つかえないよ");
          return;
        }
        recording = true;
        recBtn.classList.add("rec");
        recBtn.textContent = "⏹ ろくおん中… おして ていし";
        let left = Math.round(MAX_MS / 1000);
        limitEl.textContent = `のこり ${left}びょう`;
        tick = window.setInterval(() => {
          left -= 1;
          limitEl.textContent = left > 0 ? `のこり ${left}びょう` : "…";
        }, 1000);
        autoStop = window.setTimeout(stop, MAX_MS);
      })();
    });
    tap(playBtn, () => {
      if (current) void playBlob(current);
    });
    tap(ov.querySelector("#vr-close")!, () => {
      plink(12, 0.3);
      cancel();
    });
    ov.addEventListener("pointerdown", (e) => {
      if (e.target === ov) {
        e.preventDefault();
        cancel();
      }
    });
  });
}

/** Re-record one word's voice in place, then run `onSaved`. */
export function openVoiceRecorder(key: string, label: string, onSaved: () => void): void {
  void (async () => {
    const current = await getVoice(key);
    const blob = await recordVoice({ label, current: current ?? null });
    if (!blob) return;
    await putVoice(key, blob);
    plink(16, 0.35);
    onSaved();
  })();
}
