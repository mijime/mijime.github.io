// One registry for the modal sheets (`.overlay`) appended to document.body.
//
// A screen's render() closes every open overlay, so a sheet can never outlive
// the screen that opened it. Without this, the camera / crop / recorder sheet
// stayed on top of the home screen after the Android back button changed hash
// (render() only clears #app, and these sheets live on <body>).

const overlays = new Set<HTMLElement>();
const cleanups = new WeakMap<HTMLElement, () => void>();

/** Create a bottom-sheet overlay, closed when dropped or when the screen changes. */
export function makeOverlay(className = "overlay"): HTMLElement {
  const el = document.createElement("div");
  el.className = className;
  document.body.append(el);
  overlays.add(el);
  return el;
}

/** Extra teardown (e.g. freeing an ImageBitmap) to run however the overlay closes. */
export function onOverlayClose(el: HTMLElement, fn: () => void): void {
  cleanups.set(el, fn);
}

/** Remove one overlay through its own close/cancel path. */
export function dropOverlay(el: HTMLElement): void {
  overlays.delete(el);
  cleanups.get(el)?.();
  cleanups.delete(el);
  el.remove();
}

/** Close every open overlay; called when the screen changes. */
export function closeOverlays(): void {
  // Snapshot first: a cleanup may close another overlay.
  const targets = [...overlays];
  for (const el of targets) {
    overlays.delete(el);
    cleanups.get(el)?.();
    cleanups.delete(el);
    el.remove();
  }
}
