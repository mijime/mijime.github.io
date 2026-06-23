import { useMemo, useRef } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { usePanZoom } from "../hooks/use-pan-zoom";
import { useTween } from "../hooks/use-tween";
import { ConnectionLines } from "./ConnectionLines";
import { NodeCard } from "./NodeCard";

function isParentCollapsed(state: ReturnType<typeof useMindStore>["state"], id: string): boolean {
  const node = state.nodes[id];
  if (!node) return true;
  if (node.isRoot) return false;
  let parent = state.nodes[node.parentId!];
  while (parent) {
    if (parent.collapsed) return true;
    if (parent.isRoot) break;
    parent = state.nodes[parent.parentId!];
  }
  return false;
}

export function Canvas() {
  const { state } = useMindStore();
  const containerRef = useRef<HTMLDivElement>(null);

  usePanZoom({ containerRef });
  useTween();

  const visibleNodes = useMemo(
    () =>
      Object.values(state.nodes).filter((n) => {
        if (state.currentBoardId && n.boardId !== state.currentBoardId) return false;
        if (isParentCollapsed(state, n.id)) return false;
        if (state.hideCompleted && n.completed && !n.isRoot) return false;
        return true;
      }),
    [state.nodes, state.currentBoardId, state.hideCompleted],
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing canvas-grid relative overflow-hidden bg-slate-50 dark:bg-slate-900"
    >
      <ConnectionLines containerRef={containerRef} />
      <div
        className="transform-container absolute w-px h-px top-1/2 left-1/2"
        style={{
          transform: `translate(${state.view.pan.x}px, ${state.view.pan.y}px) scale(${state.view.zoom})`,
        }}
      >
        {visibleNodes.map((n) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </div>
    </div>
  );
}
