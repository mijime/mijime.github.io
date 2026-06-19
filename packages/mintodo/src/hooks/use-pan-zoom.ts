import { useEffect, type RefObject } from "react";
import { useMindStore } from "./use-mind-store";

interface Options {
  containerRef: RefObject<HTMLDivElement | null>;
}

export function usePanZoom({ containerRef }: Options): void {
  const { state, dispatch } = useMindStore();

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
      dispatch({
        type: "SET_VIEW",
        view: {
          pan: { x: state.view.pan.x + dx, y: state.view.pan.y + dy },
          zoom: state.view.zoom,
        },
      });
    }
    function onMouseUp() {
      isPanning = false;
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = 1.1;
      const next = e.deltaY < 0 ? state.view.zoom * factor : state.view.zoom / factor;
      const zoom = Math.max(0.2, Math.min(3, next));
      dispatch({ type: "SET_VIEW", view: { pan: state.view.pan, zoom } });
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
      dispatch({
        type: "SET_VIEW",
        view: {
          pan: { x: state.view.pan.x + dx, y: state.view.pan.y + dy },
          zoom: state.view.zoom,
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
  }, [containerRef, state.view, dispatch]);
}
