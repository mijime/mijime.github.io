// Pick which square of a chosen image to keep. The cards are 1:1, so the stage
// is a square: drag to move the picture, pinch or use the slider to zoom, then
// OK. The crop is cut from the full-resolution image, so it stays sharp.
//
// Resolves with the full + thumbnail JPEGs, or null if the parent cancels.

import { encodeSquare } from "./custom";
import { tap } from "./ui";
import { makeOverlay, dropOverlay, onOverlayClose } from "./overlay";

export type CropResult = { full: Blob; thumb: Blob };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const MAX_DISPLAY = 1600; // the on-screen copy is capped; the crop uses the full image

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Square a photo off without asking anything: keep the biggest centred square.
 * This is what the child-first flow (photoadd.ts) uses — a toddler cannot drag
 * and pinch a crop box, and a photo taken to show one object has it in the
 * middle anyway. The parent's flow still opens the cropper.
 */
export async function autoSquare(file: Blob): Promise<CropResult | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    return await encodeSquare(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side);
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

export function openCropper(file: Blob): Promise<CropResult | null> {
  return new Promise((resolve) => {
    void (async () => {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        resolve(null);
        return;
      }
      const iw = bitmap.width;
      const ih = bitmap.height;

      const ov = makeOverlay();
      ov.innerHTML = `<div class="sheet">
        <h3>きるところを えらぶ</h3>
        <p class="sheet-sub">ゆびで うごかして、ひろげて みてね</p>
        <div class="crop-stage" id="cr-stage"></div>
        <div class="crop-zoom">
          <span>ちいさく</span>
          <input type="range" id="cr-zoom" min="${MIN_ZOOM}" max="${MAX_ZOOM}" step="0.01" value="1">
          <span>おおきく</span>
        </div>
        <div class="sheet-actions">
          <button class="pill" id="cr-cancel" type="button">やめる</button>
          <button class="pill" id="cr-ok" type="button">これで OK</button>
        </div>
      </div>`;

      const stage = ov.querySelector<HTMLElement>("#cr-stage")!;
      const slider = ov.querySelector<HTMLInputElement>("#cr-zoom")!;
      const S = Math.round(
        Math.max(200, Math.min(window.innerWidth - 40, window.innerHeight - 300, 440)),
      );
      stage.style.width = `${S}px`;
      stage.style.height = `${S}px`;

      // Show a (capped) copy of the same bitmap the crop is cut from, so what
      // the parent sees is exactly what gets saved, orientation included.
      const dispScale = Math.min(1, MAX_DISPLAY / Math.max(iw, ih));
      const dw = Math.max(1, Math.round(iw * dispScale));
      const dh = Math.max(1, Math.round(ih * dispScale));
      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;
      canvas.className = "crop-img";
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, dw, dh);
      stage.append(canvas);

      const baseScale = Math.max(S / dw, S / dh); // cover the square at zoom 1
      let zoom = 1;
      let dx = 0;
      let dy = 0;

      const apply = (): void => {
        const scale = baseScale * zoom;
        const dxMax = Math.max(0, (dw * scale - S) / 2);
        const dyMax = Math.max(0, (dh * scale - S) / 2);
        dx = clamp(dx, -dxMax, dxMax);
        dy = clamp(dy, -dyMax, dyMax);
        const left = S / 2 + dx - (dw * scale) / 2;
        const top = S / 2 + dy - (dh * scale) / 2;
        canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
      };
      apply();

      /* drag with one finger, pinch with two */
      const pointers = new Map<number, { x: number; y: number }>();
      let pinch: { dist: number; zoom: number } | null = null;
      let last = { x: 0, y: 0 };

      stage.addEventListener("pointerdown", (e) => {
        stage.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
          last = { x: e.clientX, y: e.clientY };
        } else if (pointers.size === 2) {
          const [a, b] = [...pointers.values()] as [
            { x: number; y: number },
            { x: number; y: number },
          ];
          pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
        }
      });
      stage.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size >= 2 && pinch) {
          const [a, b] = [...pointers.values()] as [
            { x: number; y: number },
            { x: number; y: number },
          ];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          zoom = clamp(pinch.zoom * (dist / pinch.dist), MIN_ZOOM, MAX_ZOOM);
          slider.value = String(zoom);
          apply();
        } else if (pointers.size === 1) {
          dx += e.clientX - last.x;
          dy += e.clientY - last.y;
          last = { x: e.clientX, y: e.clientY };
          apply();
        }
      });
      const endPointer = (e: PointerEvent): void => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        const only = pointers.size === 1 ? [...pointers.values()][0] : undefined;
        if (only) last = { x: only.x, y: only.y };
      };
      stage.addEventListener("pointerup", endPointer);
      stage.addEventListener("pointercancel", endPointer);

      slider.addEventListener("input", () => {
        zoom = clamp(Number(slider.value) || 1, MIN_ZOOM, MAX_ZOOM);
        pinch = null;
        apply();
      });

      const cleanup = (): void => {
        dropOverlay(ov);
      };
      onOverlayClose(ov, () => bitmap.close());

      tap(ov.querySelector("#cr-ok")!, () => {
        void (async () => {
          const scale = baseScale * zoom;
          const side = S / scale / dispScale;
          let sx = (dw / 2 - (S / 2 + dx) / scale) / dispScale;
          let sy = (dh / 2 - (S / 2 + dy) / scale) / dispScale;
          sx = clamp(sx, 0, Math.max(0, iw - side));
          sy = clamp(sy, 0, Math.max(0, ih - side));
          try {
            const out = await encodeSquare(bitmap, sx, sy, side);
            cleanup();
            resolve(out);
          } catch {
            cleanup();
            resolve(null);
          }
        })();
      });
      tap(ov.querySelector("#cr-cancel")!, () => {
        cleanup();
        resolve(null);
      });
      ov.addEventListener("pointerdown", (e) => {
        if (e.target === ov) {
          e.preventDefault();
          cleanup();
          resolve(null);
        }
      });
    })();
  });
}
