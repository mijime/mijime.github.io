import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";

interface Options {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function usePanZoom({ containerRef }: Options): void {
  const { state, dispatch } = useMindStore();
  const viewRef = useRef(state.view);
  viewRef.current = state.view;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    function onMouseDown(e: MouseEvent) {
      if (e.target !== el) return;
      isPanning = true;
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
      dispatch({
        type: "SET_VIEW",
        view: {
          pan: { x: view.pan.x + dx, y: view.pan.y + dy },
          zoom: view.zoom,
        },
      });
    }
    function onMouseUp() {
      isPanning = false;
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const view = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = (el as HTMLDivElement).getBoundingClientRect();
        // Mouse position relative to the transform origin (container center)
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;
        const factor = Math.exp(-e.deltaY * 0.01);
        const zoom = Math.max(0.2, Math.min(3, view.zoom * factor));
        const scale = zoom / view.zoom;
        dispatch({
          type: "SET_VIEW",
          view: {
            pan: { x: mx - (mx - view.pan.x) * scale, y: my - (my - view.pan.y) * scale },
            zoom,
          },
        });
        return;
      }
      const dx = e.shiftKey ? e.deltaY + e.deltaX : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      dispatch({
        type: "SET_VIEW",
        view: { pan: { x: view.pan.x - dx, y: view.pan.y - dy }, zoom: view.zoom },
      });
    }
    function onTouchStart(e: TouchEvent) {
      if (e.target !== el) return;
      if (e.touches.length !== 1) return;
      isPanning = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (!isPanning || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      const view = viewRef.current;
      dispatch({
        type: "SET_VIEW",
        view: {
          pan: { x: view.pan.x + dx, y: view.pan.y + dy },
          zoom: view.zoom,
        },
      });
    }
    function onTouchEnd() {
      isPanning = false;
    }

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef, dispatch]);
}
