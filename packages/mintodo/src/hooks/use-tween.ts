import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";
import { EDGE_INSET } from "../components/ConnectionLines";

const TWEEN_DURATION = 300;
const EASING = "cubic-bezier(0.25, 1, 0.5, 1)";
const MIN_CURVE_SPREAD = 60;

function pathD(
  psx: number,
  psy: number,
  pex: number,
  pey: number,
  options?: {
    zoom?: number;
    pan?: { x: number; y: number };
    containerSize?: { width: number; height: number };
  },
): string {
  const zoom = options?.zoom ?? 1;
  const pan = options?.pan ?? { x: 0, y: 0 };
  const containerSize = options?.containerSize ?? { width: 0, height: 0 };
  const cx = containerSize.width / 2;
  const cy = containerSize.height / 2;

  const worldSx = psx + EDGE_INSET;
  const worldEx = pex - EDGE_INSET;
  const horizontalDist = worldEx - worldSx;
  const halfDist = Math.max(Math.abs(horizontalDist) / 2, MIN_CURVE_SPREAD);
  const sign = horizontalDist >= 0 ? 1 : -1;

  const worldC1x = worldSx + sign * halfDist;
  const worldC2x = worldEx - sign * halfDist;

  const sx = cx + worldSx * zoom + pan.x;
  const sy = cy + psy * zoom + pan.y;
  const ex = cx + worldEx * zoom + pan.x;
  const ey = cy + pey * zoom + pan.y;
  const c1x = cx + worldC1x * zoom + pan.x;
  const c1y = cy + psy * zoom + pan.y;
  const c2x = cx + worldC2x * zoom + pan.x;
  const c2y = cy + pey * zoom + pan.y;

  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
}

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
          const edge = document.querySelector<Element>(`#edge-${n.parentId}-${id}`);
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
              {
                d: `path("${pathD(a.parent.x, a.parent.y, a.from.x, a.from.y, {
                  zoom: state.view.zoom,
                  pan: state.view.pan,
                  containerSize: {
                    width: (a.el as SVGElement).ownerSVGElement?.clientWidth ?? 800,
                    height: (a.el as SVGElement).ownerSVGElement?.clientHeight ?? 600,
                  },
                })}")`,
              },
              {
                d: `path("${pathD(a.parent.x, a.parent.y, a.to.x, a.to.y, {
                  zoom: state.view.zoom,
                  pan: state.view.pan,
                  containerSize: {
                    width: (a.el as SVGElement).ownerSVGElement?.clientWidth ?? 800,
                    height: (a.el as SVGElement).ownerSVGElement?.clientHeight ?? 600,
                  },
                })}")`,
              },
            ];
      a.el.animate(keyframes as unknown as Keyframe[], {
        duration: TWEEN_DURATION,
        easing: EASING,
        fill: "none",
      });
    }
  }, [state.layoutVersion, state.nodes]);
}
