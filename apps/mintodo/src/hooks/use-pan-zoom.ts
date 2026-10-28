import { useEffect, useRef } from "react";
import type { View } from "../types";
import { useMindStore } from "./use-mind-store";

interface Options {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

interface Point {
  x: number;
  y: number;
}

interface PinchState {
  dist: number;
  centerX: number;
  centerY: number;
}

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/** 指定した画面座標を固定したままズームした View を返す。 */
export function zoomAtPoint(
  view: View,
  factor: number,
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): View {
  const zoom = clampZoom(view.zoom * factor);
  const scale = zoom / view.zoom;
  // transform origin（コンテナ中心）からの相対座標
  const mx = clientX - rect.left - rect.width / 2;
  const my = clientY - rect.top - rect.height / 2;
  return {
    pan: { x: mx - (mx - view.pan.x) * scale, y: my - (my - view.pan.y) * scale },
    zoom,
  };
}

function measurePinch(pointers: Map<number, Point>): PinchState {
  const [a, b] = [...pointers.values()];
  return {
    dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
    centerX: (a.x + b.x) / 2,
    centerY: (a.y + b.y) / 2,
  };
}

export function usePanZoom({ containerRef }: Options): void {
  const { state, dispatch } = useMindStore();
  const viewRef = useRef(state.view);
  viewRef.current = state.view;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    // タッチ（Pointer Events）用。2本指でピンチズーム＋パン。
    const pointers = new Map<number, Point>();
    let pinch: PinchState | null = null;

    // ジェスチャ中は CSS transition を切って、指の動きに 1:1 で追従させる。
    function beginGesture() {
      if (!container) return;
      container.classList.add("is-gesturing");
    }
    function endGesture() {
      if (!container) return;
      if (pointers.size === 0 && !isPanning) container.classList.remove("is-gesturing");
    }

    // dispatch を待たずに view を更新し、連続する pointermove で差分が失われないようにする。
    function applyView(view: View) {
      viewRef.current = view;
      dispatch({ type: "SET_VIEW", view });
    }

    function onMouseDown(e: MouseEvent) {
      if (e.target !== container) return;
      isPanning = true;
      beginGesture();
      lastX = e.clientX;
      lastY = e.clientY;
      dispatch({ id: "root", type: "SELECT" });
    }
    function onMouseMove(e: MouseEvent) {
      if (!isPanning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const view = viewRef.current;
      applyView({
        pan: { x: view.pan.x + dx, y: view.pan.y + dy },
        zoom: view.zoom,
      });
    }
    function onMouseUp() {
      isPanning = false;
      endGesture();
    }
    function onWheel(e: WheelEvent) {
      if (!container) return;
      e.preventDefault();
      const view = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = container.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * 0.01);
        applyView(zoomAtPoint(view, factor, e.clientX, e.clientY, rect));
        return;
      }
      const dx = e.shiftKey ? e.deltaY + e.deltaX : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      applyView({ pan: { x: view.pan.x - dx, y: view.pan.y - dy }, zoom: view.zoom });
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      // 背景から始まったタッチだけをパン／ピンチの対象にする。
      // 2本目以降はカード上に落ちても受け付ける。
      if (pointers.size === 0) {
        if (e.target !== container) return;
      } else {
        // 2本目のタッチで dnd-kit のドラッグが始まらないようにする。
        e.stopPropagation();
      }
      beginGesture();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinch = pointers.size === 2 ? measurePinch(pointers) : null;
    }
    function onPointerMove(e: PointerEvent) {
      if (!container) return;
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const view = viewRef.current;
      if (pointers.size === 1) {
        applyView({
          pan: {
            x: view.pan.x + (e.clientX - prev.x),
            y: view.pan.y + (e.clientY - prev.y),
          },
          zoom: view.zoom,
        });
        return;
      }
      if (pointers.size !== 2) return;

      const next = measurePinch(pointers);
      if (!pinch) {
        pinch = next;
        return;
      }
      const factor = next.dist / pinch.dist;
      const rect = container.getBoundingClientRect();
      const zoomed = zoomAtPoint(view, factor, next.centerX, next.centerY, rect);
      applyView({
        pan: {
          x: zoomed.pan.x + (next.centerX - pinch.centerX),
          y: zoomed.pan.y + (next.centerY - pinch.centerY),
        },
        zoom: zoomed.zoom,
      });
      pinch = next;
    }
    function onPointerEnd(e: PointerEvent) {
      pointers.delete(e.pointerId);
      pinch = pointers.size === 2 ? measurePinch(pointers) : null;
      endGesture();
    }

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      container.classList.remove("is-gesturing");
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [containerRef, dispatch]);
}
