import { useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";

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

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ConnectionLines({ containerRef }: Props) {
  const { state } = useMindStore();
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) setSize({ height: entry.contentRect.height, width: entry.contentRect.width });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  const cx = size.width / 2;
  const cy = size.height / 2;
  const activeColor = "var(--terra)";
  const inactiveColor = "var(--grid)";

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ width: size.width, height: size.height }}
    >
      {Object.values(state.nodes).map((node) => {
        if (node.isRoot) return null;
        if (isParentCollapsed(state, node.id)) return null;
        if (state.hideCompleted && node.completed) return null;
        const parent = state.nodes[node.parentId!];
        if (!parent) return null;
        const sx = cx + parent.x * state.view.zoom + state.view.pan.x;
        const sy = cy + parent.y * state.view.zoom + state.view.pan.y;
        const ex = cx + node.x * state.view.zoom + state.view.pan.x;
        const ey = cy + node.y * state.view.zoom + state.view.pan.y;
        const c1x = sx + (ex - sx) * 0.5;
        const c1y = sy;
        const c2x = sx + (ex - sx) * 0.5;
        const c2y = ey;
        const color = node.completed ? inactiveColor : activeColor;
        const pathProps = node.completed
          ? { strokeDasharray: "5,5", strokeWidth: 1.5 }
          : { strokeWidth: 2 };
        return (
          <path
            key={node.id}
            d={`M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`}
            stroke={color}
            fill="none"
            {...pathProps}
          />
        );
      })}
    </svg>
  );
}
