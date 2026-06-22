import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";

const VALID_TARGET_CLASSES = ["ring-2", "ring-sky-400"];

function findDropTarget(x: number, y: number, excludeId: string): string | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const card = (el as HTMLElement).closest<HTMLElement>("[data-node-id]");
  if (!card) return null;
  const id = card.dataset.nodeId;
  if (!id || id === excludeId) return null;
  return id;
}

function isAncestor(
  state: ReturnType<typeof useMindStore>["state"],
  ancestorId: string,
  nodeId: string,
): boolean {
  let cur = state.nodes[nodeId];
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = state.nodes[cur.parentId];
  }
  return false;
}

export function useDragNode(): void {
  const { state, dispatch } = useMindStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    currentTargetEl: HTMLElement | null;
  } | null>(null);

  useEffect(() => {
    function getClient(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
      if ("touches" in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return t ? { x: t.clientX, y: t.clientY } : null;
      }
      return { x: e.clientX, y: e.clientY };
    }

    function clearTargetHighlight() {
      const t = dragRef.current?.currentTargetEl;
      if (t) t.classList.remove(...VALID_TARGET_CLASSES);
      if (dragRef.current) dragRef.current.currentTargetEl = null;
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      const card = target.closest<HTMLElement>("[data-node-id]");
      if (!card) return;
      const cardId = card.dataset.nodeId;
      if (!cardId) return;
      const n = stateRef.current.nodes[cardId];
      if (!n) return;
      const client = getClient(e);
      if (!client) return;
      dragRef.current = {
        id: cardId,
        startX: client.x,
        startY: client.y,
        nodeStartX: n.x,
        nodeStartY: n.y,
        currentTargetEl: null,
      };
      dispatch({ id: cardId, type: "SELECT" });
      dispatch({ id: cardId, type: "SET_DRAGGING" });
      const cardEl = document.getElementById(`node-dom-${cardId}`);
      if (cardEl) cardEl.style.pointerEvents = "none";
      if ("touches" in e) return;
      e.stopPropagation();
      e.preventDefault();
    }

    function onPointerMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      const client = getClient(e);
      if (!client) return;
      const { zoom } = stateRef.current.view;
      const dx = (client.x - d.startX) / zoom;
      const dy = (client.y - d.startY) / zoom;
      const el = document.querySelector<HTMLElement>(`#node-dom-${d.id}`);
      if (el) {
        el.style.left = `${d.nodeStartX + dx}px`;
        el.style.top = `${d.nodeStartY + dy}px`;
      }
      const targetId = findDropTarget(client.x, client.y, d.id);
      const next = targetId
        ? document.querySelector<HTMLElement>(`[data-node-id="${targetId}"]`)
        : null;
      if (next !== d.currentTargetEl) {
        clearTargetHighlight();
        if (next) {
          const s = stateRef.current;
          if (targetId !== null && targetId !== "root" && !isAncestor(s, d.id, targetId)) {
            next.classList.add(...VALID_TARGET_CLASSES);
            d.currentTargetEl = next;
          }
        }
      }
    }

    function onPointerUp(e: MouseEvent | TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      clearTargetHighlight();
      const client = getClient(e);
      if (!client) {
        dragRef.current = null;
        dispatch({ id: null, type: "SET_DRAGGING" });
        return;
      }
      const targetId = findDropTarget(client.x, client.y, d.id);
      const s = stateRef.current;
      const isValid =
        targetId !== null &&
        targetId !== d.id &&
        targetId !== "root" &&
        !isAncestor(s, d.id, targetId);
      if (isValid) {
        dispatch({ id: d.id, newParentId: targetId, type: "REPARENT" });
      } else {
        dispatch({ id: d.id, type: "SNAP_BACK" });
      }
      const draggedEl = document.getElementById(`node-dom-${d.id}`);
      if (draggedEl) draggedEl.style.pointerEvents = "";
      dragRef.current = null;
      dispatch({ id: null, type: "SET_DRAGGING" });
    }

    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("touchstart", onPointerDown, true);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("touchstart", onPointerDown, true);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [dispatch]);
}
