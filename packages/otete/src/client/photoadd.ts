// しゃしんを とる — child-first flow to add a real photo to a word.

import { cheer, plink, boing } from "./audio";
import { autoSquare } from "./crop";
import { addWordPhoto, loadAllWords, wordKey } from "./custom";
import { celebrate } from "./fx";
import { dropOverlay, makeOverlay } from "./overlay";
import { tap } from "./ui";
import type { Word } from "./voice";

const picture = (w: Word): string =>
  w.thumbUrl
    ? `<img src="${w.thumbUrl}" alt="">`
    : `<span class="pa-card-emo">${w.emoji ?? "🔤"}</span>`;

export function openPhotoAdd(onDone?: (word: Word) => void): void {
  const ov = makeOverlay();
  ov.innerHTML = `<div class="pa">
    <div class="toy-topbar">
      <button class="pill" id="pa-close" type="button">✕</button>
      <div class="toy-badge" id="pa-title">📷 しゃしん</div>
      <span></span>
    </div>
    <div class="pa-body" id="pa-body"></div>
  </div>`;

  const body = ov.querySelector<HTMLElement>("#pa-body")!;
  const title = ov.querySelector<HTMLElement>("#pa-title")!;
  const close = (): void => dropOverlay(ov);
  tap(ov.querySelector("#pa-close")!, () => {
    plink(12, 0.3);
    close();
  });

  const cam = document.createElement("input");
  cam.type = "file";
  cam.accept = "image/*";
  cam.capture = "environment";
  cam.hidden = true;
  const album = document.createElement("input");
  album.type = "file";
  album.accept = "image/*";
  album.hidden = true;
  ov.append(cam, album);

  const ask = (): void => {
    title.textContent = "📷 しゃしん";
    body.innerHTML = `
      <div class="pa-choices">
        <button class="pa-big" id="pa-cam" type="button">
          <span class="pa-big-emo">📷</span><span class="pa-big-txt">しゃしんを とる</span>
        </button>
        <button class="pa-big ghost" id="pa-album" type="button">
          <span class="pa-big-emo">🖼️</span><span class="pa-big-txt">アルバムから</span>
        </button>
        <button class="pill" id="pa-cancel" type="button">やめる</button>
      </div>`;
    tap(body.querySelector("#pa-cam")!, () => {
      plink(12, 0.3);
      cam.click();
    });
    tap(body.querySelector("#pa-album")!, () => {
      plink(12, 0.3);
      album.click();
    });
    tap(body.querySelector("#pa-cancel")!, () => {
      plink(12, 0.3);
      close();
    });
  };

  const onFile = (input: HTMLInputElement): void => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    title.textContent = "📷 しゃしん";
    body.innerHTML = '<div class="pa-wait">ちょっと まってね…</div>';
    void (async () => {
      const photo = await autoSquare(file);
      if (!photo) {
        boing(0.85);
        ask();
        return;
      }
      choose(photo);
    })();
  };
  cam.addEventListener("change", () => onFile(cam));
  album.addEventListener("change", () => onFile(album));

  const choose = (photo: { full: Blob; thumb: Blob }): void => {
    const preview = URL.createObjectURL(photo.thumb);
    title.textContent = "これは なに？";
    body.innerHTML = `
      <div class="pa-preview"><img src="${preview}" alt=""></div>
      <div class="pa-grid" id="pa-grid"><div class="pa-wait">よみこみ中…</div></div>`;
    let released = false;
    const release = (): void => {
      if (!released) {
        released = true;
        URL.revokeObjectURL(preview);
      }
    };

    void (async () => {
      const grid = body.querySelector<HTMLElement>("#pa-grid")!;
      const all = await loadAllWords();
      const words = all.toSorted(
        (a, b) =>
          a.category.localeCompare(b.category, "ja") || a.label.localeCompare(b.label, "ja"),
      );
      grid.innerHTML = words
        .map(
          (w, i) => `<button class="pa-card" data-i="${i}" type="button">
          <span class="pa-card-pic">${picture(w)}</span>
        </button>`,
        )
        .join("");
      grid.querySelectorAll<HTMLElement>(".pa-card").forEach((card) => {
        tap(card, () => {
          const w = words[Number(card.dataset.i ?? 0)];
          if (!w) return;
          void (async () => {
            await addWordPhoto(wordKey(w), photo);
            const r = card.getBoundingClientRect();
            celebrate(r.left + r.width / 2, r.top + r.height / 2);
            cheer();
            release();
            close();
            onDone?.(w);
          })();
        });
      });
    })();
  };

  ask();
}
