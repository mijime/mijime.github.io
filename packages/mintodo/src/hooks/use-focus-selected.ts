import { useEffect } from "react";
import { useMindStore } from "./use-mind-store";

const MARGIN = 40;

export function computeFocusPan(
  rect: { width: number; height: number },
  nodePos: { x: number; y: number },
  view: { pan: { x: number; y: number }; zoom: number },
  margin: number = MARGIN,
): { x: number; y: number } | null {
  if (rect.width === 0) return null;
  const sx = rect.width / 2 + nodePos.x * view.zoom + view.pan.x;
  const sy = rect.height / 2 + nodePos.y * view.zoom + view.pan.y;
  let dx = 0;
  let dy = 0;
  if (sx < margin) dx = margin - sx;
  else if (sx > rect.width - margin) dx = rect.width - margin - sx;
  if (sy < margin) dy = margin - sy;
  else if (sy > rect.height - margin) dy = rect.height - margin - sy;
  if (dx === 0 && dy === 0) return null;
  return { x: view.pan.x + dx, y: view.pan.y + dy };
}

export function useFocusSelected({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}): void {
  const { state, dispatch } = useMindStore();
  const { selectedNodeId, layoutVersion } = state;

  useEffect(() => {
    const el = containerRef.current;
    const node = state.nodes[selectedNodeId];
    if (!el || !node) return;
    const rect = el.getBoundingClientRect();
    const newPan = computeFocusPan(rect, { x: node.x, y: node.y }, state.view);
    if (newPan) {
      dispatch({
        type: "SET_VIEW",
        view: { pan: newPan, zoom: state.view.zoom },
      });
    }
    // Deliberately depends only on selection/layout changes, not view, to avoid feedback loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, layoutVersion]);
}
