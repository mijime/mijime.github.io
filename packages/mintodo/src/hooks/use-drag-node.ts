import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";

interface DragAction { type: "MOVE_NODE"; id: string; x: number; y: number }
type DragCallback = (a: DragAction) => void;

export function useDragNode(onMove: DragCallback): void {
  const { state, dispatch } = useMindStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    let isDragging = false;
    let id: string | null = null;
    let startX = 0;
    let startY = 0;
    let nodeStartX = 0;
    let nodeStartY = 0;

    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      const card = target.closest<HTMLElement>("[data-node-id]");
      if (!card) return;
      const cardId = card.dataset.nodeId!;
      const n = stateRef.current.nodes[cardId];
      if (!n) return;
      id = cardId;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      nodeStartX = n.x;
      nodeStartY = n.y;
      dispatch({ id: cardId, type: "SELECT" });
      dispatch({ id: cardId, type: "SET_DRAGGING" });
      e.stopPropagation();
      e.preventDefault();
    }
    function onMouseMove(e: MouseEvent) {
      if (!isDragging || !id) return;
      const {zoom} = stateRef.current.view;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      onMoveRef.current({ id, type: "MOVE_NODE", x: nodeStartX + dx, y: nodeStartY + dy });
    }
    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      id = null;
      dispatch({ id: null, type: "SET_DRAGGING" });
    }
    function onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      const card = target.closest<HTMLElement>("[data-node-id]");
      if (!card) return;
      const cardId = card.dataset.nodeId!;
      const n = stateRef.current.nodes[cardId];
      if (!n) return;
      id = cardId;
      isDragging = true;
      const [t] = e.touches;
      startX = t.clientX;
      startY = t.clientY;
      nodeStartX = n.x;
      nodeStartY = n.y;
      dispatch({ id: cardId, type: "SELECT" });
      dispatch({ id: cardId, type: "SET_DRAGGING" });
    }
    function onTouchMove(e: TouchEvent) {
      if (!isDragging || !id || e.touches.length !== 1) return;
      const [t] = e.touches;
      const {zoom} = stateRef.current.view;
      const dx = (t.clientX - startX) / zoom;
      const dy = (t.clientY - startY) / zoom;
      onMoveRef.current({ id, type: "MOVE_NODE", x: nodeStartX + dx, y: nodeStartY + dy });
    }
    function onTouchEnd() {
      if (!isDragging) return;
      isDragging = false;
      id = null;
      dispatch({ id: null, type: "SET_DRAGGING" });
    }

    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchstart", onTouchStart, true);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dispatch]);
}
