// Ask where a picture comes from — the camera or an image already on the phone —
// then let the parent choose the square to keep (crop.ts). Shared by the
// add/edit form and by replacing a built-in word's emoji with a photo.

import { openCropper } from "./crop";
import { tap } from "./ui";
import { makeOverlay, dropOverlay } from "./overlay";

export type Photo = { full: Blob; thumb: Blob };

/** Resolves the cropped photo, `'clear'` when the parent asks to remove the
 *  current one (only offered with `allowClear`), or null if they back out. */
export function pickPhoto(opts: { allowClear?: boolean } = {}): Promise<Photo | "clear" | null> {
  return new Promise((resolve) => {
    const ov = makeOverlay();
    ov.innerHTML = `<div class="sheet">
      <h3>しゃしん</h3>
      <div class="sheet-actions">
        <button class="pill" id="ph-cam" type="button">📷 とる</button>
        <button class="pill" id="ph-pick" type="button">🖼 えらぶ</button>
        ${opts.allowClear ? '<button class="pill danger" id="ph-clear" type="button">🗑 けす</button>' : ""}
      </div>
      <p class="sheet-note" id="ph-note"></p>
    </div>`;

    const cam = document.createElement("input");
    cam.type = "file";
    cam.accept = "image/*";
    cam.capture = "environment";
    cam.hidden = true;
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.hidden = true;
    ov.append(cam, file);

    let settled = false;
    const finish = (v: Photo | "clear" | null): void => {
      if (settled) return;
      settled = true;
      dropOverlay(ov);
      resolve(v);
    };
    const onFile = (input: HTMLInputElement): void => {
      const f = input.files?.[0];
      input.value = "";
      if (!f) return;
      dropOverlay(ov); // the crop screen takes over
      void openCropper(f).then((r) => finish(r));
    };

    tap(ov.querySelector("#ph-cam")!, () => cam.click());
    tap(ov.querySelector("#ph-pick")!, () => file.click());
    cam.addEventListener("change", () => onFile(cam));
    file.addEventListener("change", () => onFile(file));
    const clearBtn = ov.querySelector("#ph-clear");
    if (clearBtn) {
      let armed = false;
      tap(clearBtn, () => {
        if (armed) {
          finish("clear");
          return;
        }
        armed = true;
        clearBtn.textContent = "ほんとうに けす？";
        window.setTimeout(() => {
          if (armed) {
            armed = false;
            clearBtn.textContent = "🗑 けす";
          }
        }, 4000);
      });
    }
    ov.addEventListener("pointerdown", (e) => {
      if (e.target === ov) {
        e.preventDefault();
        finish(null);
      }
    });
  });
}
