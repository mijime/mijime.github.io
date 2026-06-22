import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";

const TWEEN_DURATION = 300;
const EASING = "cubic-bezier(0.25, 1, 0.5, 1)";

interface Pos {
  x: number;
  y: number;
}

function snapshotPositions(nodes: Record<string, { x: number; y: number }>): Record<string, Pos> {
  const out: Record<string, Pos> = {};
  for (const [id, n] of Object.entries(nodes)) out[id] = { x: n.x, y: n.y };
  return out;
}

function parentPosOr(
  state: ReturnType<typeof useMindStore>["state"],
  id: string,
  fallback: Pos,
): Pos {
  const n = state.nodes[id];
  if (!n || !n.parentId) return fallback;
  const p = state.nodes[n.parentId];
  return p ? { x: p.x, y: p.y } : fallback;
}

export function useTween(): void {
  const { state } = useMindStore();
  const prevRef = useRef<Record<string, Pos>>({});
  const seenVersionRef = useRef<number>(0);

  useEffect(() => {
    if (Object.keys(prevRef.current).length === 0) {
      prevRef.current = snapshotPositions(state.nodes);
    }
  }, [state.nodes]);

  useEffect(() => {
    if (state.draggingNodeId !== null) return;
    if (seenVersionRef.current === state.layoutVersion) return;
    if (state.layoutVersion === 0) return;

    const prev = prevRef.current;
    const fallback: Pos = { x: 0, y: 0 };
    const animations: Array<{
      el: Element;
      from: Pos;
      to: Pos;
      props: "left,top" | "x1,y1,x2,y2";
      parent: Pos;
    }> = [];

    for (const [id, n] of Object.entries(state.nodes)) {
      const p = prev[id];
      const from: Pos = p ?? parentPosOr(state, id, fallback);
      const to: Pos = { x: n.x, y: n.y };
      if (from.x === to.x && from.y === to.y && p !== undefined) continue;
      const dom = document.querySelector(`#node-dom-${id}`);
      if (dom) animations.push({ el: dom, from, to, props: "left,top", parent: from });

      if (!n.isRoot && n.parentId) {
        const parent = state.nodes[n.parentId];
        if (parent) {
          const edge = document.querySelector<SVGLineElement>(`#edge-${n.parentId}-${id}`);
          if (edge) {
            const parentAnim = animations.find(
              (a) => (a.el as HTMLElement).id === `node-dom-${n.parentId}`,
            );
            const parentTo: Pos = parentAnim ? parentAnim.to : { x: parent.x, y: parent.y };
            animations.push({ el: edge, from, to, props: "x1,y1,x2,y2", parent: parentTo });
          }
        }
      }
    }

    seenVersionRef.current = state.layoutVersion;
    prevRef.current = snapshotPositions(state.nodes);

    for (const a of animations) {
      const keyframes: Array<Record<string, string | number>> =
        a.props === "left,top"
          ? [
              { left: `${a.from.x}px`, top: `${a.from.y}px` },
              { left: `${a.to.x}px`, top: `${a.to.y}px` },
            ]
          : [
              { x1: a.from.x, y1: a.from.y, x2: a.parent.x, y2: a.parent.y },
              { x1: a.to.x, y1: a.to.y, x2: a.parent.x, y2: a.parent.y },
            ];
      a.el.animate(keyframes as unknown as Keyframe[], {
        duration: TWEEN_DURATION,
        easing: EASING,
        fill: "none",
      });
    }
  }, [state.layoutVersion, state.draggingNodeId, state.nodes]);
}
