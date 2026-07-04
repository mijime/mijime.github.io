import { useEffect } from "react";
import { useMindStore } from "./use-mind-store";

const MARGIN = 40;

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
    if (rect.width === 0) return;
    const { view } = state;
    // Node center in container coordinates (transform origin = container center)
    const sx = rect.width / 2 + node.x * view.zoom + view.pan.x;
    const sy = rect.height / 2 + node.y * view.zoom + view.pan.y;
    let dx = 0;
    let dy = 0;
    if (sx < MARGIN) dx = MARGIN - sx;
    else if (sx > rect.width - MARGIN) dx = rect.width - MARGIN - sx;
    if (sy < MARGIN) dy = MARGIN - sy;
    else if (sy > rect.height - MARGIN) dy = rect.height - MARGIN - sy;
    if (dx !== 0 || dy !== 0) {
      dispatch({
        type: "SET_VIEW",
        view: { pan: { x: view.pan.x + dx, y: view.pan.y + dy }, zoom: view.zoom },
      });
    }
    // Deliberately depends only on selection/layout changes, not view, to avoid feedback loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, layoutVersion]);
}
