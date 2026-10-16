// Parent flow: add a ことば from a photo taken on this phone.
//
// しゃしん → なまえ（ひらがな。からでも よい）→ ジャンル → こえ（5びょうまで）
// → とうろく。すべて端末内（Dexie）に保存する。
//
// The name is optional: the parent says the word while recording, and that
// recording is the word's voice (ことば plays it in みる / どれかな). A typed
// hiragana name is still shown on the card and used when there is no recording,
// so it can be left empty.
//
// It opens from the ⚙️ settings sheet, so the child can't reach the camera by
// accident. Nothing is written until とうろく, so canceling leaves no trace.

import { plink, speak } from "./audio";
import { deleteVoice, getVoice, putVoice } from "./voice";
import { CATEGORIES, addWordPhoto, getRawWordPhotos, newSlug, saveCustomWord } from "./custom";
import { pickPhoto } from "./photo";
import { recordVoice } from "./recorder";
import type { CustomWord } from "./db";
import { tap } from "./ui";
import { makeOverlay, dropOverlay } from "./overlay";

// Katakana typed by the phone keyboard becomes hiragana, so the card matches
// the rest of the dictionary.
function toHiragana(s: string): string {
  return s.replaceAll(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCodePoint((ch.codePointAt(0) ?? 0) - 0x60),
  );
}

export function openAddWord(onSaved: () => void): void {
  openWordSheet(null, onSaved);
}

/** Edit a ことば the parent registered earlier: its photo, name, genre or voice.
 *  The slug stays the same, so the word keeps its identity; moving it to another
 *  genre carries its recording along. */
export function openEditWord(word: CustomWord, onSaved: () => void): void {
  openWordSheet(word, onSaved);
}

function openWordSheet(existing: CustomWord | null, onSaved: () => void): void {
  const ov = makeOverlay();
  ov.innerHTML = `<div class="sheet addword">
    <h3>${existing ? "ことばを なおす" : "あたらしい ことば"}</h3>
    <button class="aw-photo" id="aw-photo" type="button">
      <span class="aw-photo-empty" id="aw-empty">📷<b>しゃしんを とる・えらぶ</b></span>
      <img class="aw-photo-img" id="aw-img" alt="" hidden>
    </button>

    <div class="aw-field">
      <span class="aw-label">なまえ（ひらがな・からでも よい）</span>
      <input id="aw-name" type="text" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="いぬ" maxlength="20">
    </div>

    <div class="aw-field">
      <span class="aw-label">ジャンル</span>
      <div class="aw-cats" id="aw-cats"></div>
    </div>

    <div class="aw-field">
      <span class="aw-label">こえ（5びょうまで）</span>
      <div class="aw-voice">
        <button class="ws-mic" id="aw-rec" type="button">🎤 こえで とうろく</button>
        <button class="ws-mic" id="aw-play" type="button" hidden>▶ きく</button>
      </div>
    </div>

    <div class="sheet-actions">
      <button class="pill" id="aw-cancel" type="button">やめる</button>
      <button class="pill" id="aw-save" type="button" disabled>${existing ? "ほぞん" : "とうろく"}</button>
    </div>
    <p class="sheet-note" id="aw-note"></p>
  </div>`;

  const photoBtn = ov.querySelector<HTMLElement>("#aw-photo")!;
  const img = ov.querySelector<HTMLImageElement>("#aw-img")!;
  const empty = ov.querySelector<HTMLElement>("#aw-empty")!;
  const nameInput = ov.querySelector<HTMLInputElement>("#aw-name")!;
  const catsEl = ov.querySelector<HTMLElement>("#aw-cats")!;
  const recBtn = ov.querySelector<HTMLElement>("#aw-rec")!;
  const playBtn = ov.querySelector<HTMLElement>("#aw-play")!;
  const saveBtn = ov.querySelector<HTMLButtonElement>("#aw-save")!;
  const noteEl = ov.querySelector<HTMLElement>("#aw-note")!;

  let photo: { full: Blob; thumb: Blob } | null = null;
  let photoUrl = "";
  let photoChanged = false;
  let label = "";
  let category = "";
  let voice: Blob | null = null;
  let voiceUrl = "";
  let voiceChanged = false;
  let originalVoiceKey = "";

  const note = (s: string): void => {
    noteEl.textContent = s;
  };
  // A name is only needed when there is no recording: with a voice clip the
  // word can live as the photo + the parent's voice.
  const setSave = (): void => {
    saveBtn.disabled = !(photo && category && (label || voice));
  };

  const close = (): void => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    dropOverlay(ov);
  };

  /* photo: pick from the camera or the gallery, then choose the square (photo.ts) */
  tap(photoBtn, () => {
    void (async () => {
      try {
        const cropped = await pickPhoto();
        if (!cropped || cropped === "clear") return;
        photo = cropped;
        photoChanged = true;
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        photoUrl = URL.createObjectURL(cropped.thumb);
        img.src = photoUrl;
        img.hidden = false;
        empty.hidden = true;
        note("");
      } catch {
        note("しゃしんを よみこめなかった…");
      }
      setSave();
    })();
  });

  /* name (optional) */
  nameInput.addEventListener("input", () => {
    label = nameInput.value.trim();
    setSave();
  });
  nameInput.addEventListener("change", () => {
    const h = toHiragana(nameInput.value).replaceAll(/\s+/g, "");
    nameInput.value = h;
    label = h;
    setSave();
  });

  /* genre */
  catsEl.innerHTML = CATEGORIES.map(
    (c) => `<button class="chip" data-cat="${c}" type="button">${c}</button>`,
  ).join("");
  catsEl.querySelectorAll<HTMLElement>(".chip").forEach((el) => {
    tap(el, () => {
      category = el.dataset.cat ?? "";
      catsEl
        .querySelectorAll<HTMLElement>(".chip")
        .forEach((x) => x.classList.toggle("active", x === el));
      plink(12, 0.3);
      setSave();
    });
  });

  /* editing an existing word: fill the form from what is already saved */
  if (existing) {
    nameInput.value = existing.label;
    label = existing.label;
    category = existing.category;
    originalVoiceKey = `${existing.category}/${existing.slug}`;
    catsEl.querySelectorAll<HTMLElement>(".chip").forEach((el) => {
      el.classList.toggle("active", el.dataset.cat === category);
    });
    void (async () => {
      const raw = await getRawWordPhotos(existing.slug);
      const saved = raw[0];
      if (saved) {
        photo = { full: saved.full, thumb: saved.thumb };
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        photoUrl = URL.createObjectURL(saved.thumb);
        img.src = photoUrl;
        img.hidden = false;
        empty.hidden = true;
      }
      const savedVoice = await getVoice(originalVoiceKey);
      if (savedVoice) {
        voice = savedVoice;
        if (voiceUrl) URL.revokeObjectURL(voiceUrl);
        voiceUrl = URL.createObjectURL(savedVoice);
        playBtn.hidden = false;
      }
      setSave();
    })();
  }

  /* voice: the same recorder dialog the settings and ことば screens use */
  tap(recBtn, () => {
    void (async () => {
      const blob = await recordVoice({
        title: existing ? "こえを なおす" : "こえを とうろく",
        label: label || "ことば",
        current: voice,
      });
      if (!blob) return;
      voice = blob;
      voiceChanged = true;
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
      voiceUrl = URL.createObjectURL(blob);
      playBtn.hidden = false;
      setSave();
      if (!label) note("なまえは からでも いいよ。カードには こえが つくよ");
      else note("");
    })();
  });
  tap(playBtn, () => {
    if (!voiceUrl) return;
    const a = new Audio(voiceUrl);
    void a.play().catch(() => {});
  });

  /* save (new word, or changes to an existing one) */
  tap(saveBtn, () => {
    const shot = photo;
    if (!shot || !category || !(label || voice)) return;
    saveBtn.disabled = true;
    note("ほぞん中…");
    void (async () => {
      const slug = existing ? existing.slug : newSlug();
      const newKey = `${category}/${slug}`;
      try {
        await saveCustomWord({
          slug,
          label,
          reading: label,
          category,
          ...(existing ? { createdAt: existing.createdAt } : {}),
        });
        // Photos are a gallery; add the one just picked, but keep an existing
        // word's other photos (they are managed from ことば).
        if (!existing || photoChanged) await addWordPhoto(slug, shot);
        if (existing && originalVoiceKey && originalVoiceKey !== newKey)
          await deleteVoice(originalVoiceKey);
        if (voice && (!existing || voiceChanged || newKey !== originalVoiceKey))
          await putVoice(newKey, voice);
        plink(16, 0.35);
        if (label) speak(label);
        onSaved();
        close();
      } catch {
        note("ほぞん できなかった…");
        saveBtn.disabled = false;
      }
    })();
  });

  ov.addEventListener("pointerdown", (e) => {
    if (e.target === ov) {
      e.preventDefault();
      close();
    }
  });
  tap(ov.querySelector("#aw-cancel")!, () => close());

  setSave();
}
