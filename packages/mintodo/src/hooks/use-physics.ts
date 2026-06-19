import { useEffect, useRef } from "react";
import type { State } from "../store";
import { useMindStore } from "./use-mind-store";

const REPELLING_FORCE = 1800;
const SPRING_FORCE = 0.055;
const NATURAL_LENGTH = 190;
const DAMPING = 0.85;
const REPEL_RANGE = 300;

function isParentCollapsed(state: State, id: string): boolean {
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

function shouldSkip(state: State, id: string): boolean {
  const n = state.nodes[id];
  if (!n) return true;
  if (n.isRoot) return true;
  if (isParentCollapsed(state, id)) return true;
  if (state.hideCompleted && n.completed) return true;
  return false;
}

export function usePhysics(onMoved: () => void): void {
  const { state } = useMindStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const onMovedRef = useRef(onMoved);
  onMovedRef.current = onMoved;

  useEffect(() => {
    if (!state.physicsEnabled) return;
    let rafId = 0;
    const tick = () => {
      const s = stateRef.current;
      if (s.physicsEnabled) {
        const ids = Object.keys(s.nodes);
        for (let i = 0; i < ids.length; i++) {
          if (shouldSkip(s, ids[i])) continue;
          for (let j = i + 1; j < ids.length; j++) {
            if (shouldSkip(s, ids[j])) continue;
            const a = s.nodes[ids[i]];
            const b = s.nodes[ids[j]];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < REPEL_RANGE) {
              const force = REPELLING_FORCE / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              if (a.id !== s.draggingNodeId) {
                a.vx -= fx;
                a.vy -= fy;
              }
              if (b.id !== s.draggingNodeId) {
                b.vx += fx;
                b.vy += fy;
              }
            }
          }
        }
        for (const n of Object.values(s.nodes)) {
          if (n.isRoot) continue;
          if (isParentCollapsed(s, n.id)) continue;
          if (s.hideCompleted && n.completed) continue;
          const parent = s.nodes[n.parentId!];
          if (!parent) continue;
          const dx = n.x - parent.x;
          const dy = n.y - parent.y;
          const dist = Math.hypot(dx, dy) || 1;
          const displacement = dist - NATURAL_LENGTH;
          const force = displacement * SPRING_FORCE;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (n.id !== s.draggingNodeId) {
            n.vx -= fx;
            n.vy -= fy;
          }
          if (parent.id !== s.draggingNodeId && !parent.isRoot) {
            parent.vx += fx;
            parent.vy += fy;
          }
        }
        let hasMoved = false;
        for (const n of Object.values(s.nodes)) {
          if (n.isRoot || n.id === s.draggingNodeId) continue;
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          if (Math.abs(n.vx) > 0.05 || Math.abs(n.vy) > 0.05) {
            const dom = document.querySelector<HTMLElement>(`#node-dom-${n.id}`);
            if (dom) {
              dom.style.left = `${n.x}px`;
              dom.style.top = `${n.y}px`;
              hasMoved = true;
            }
          } else {
            n.vx = 0;
            n.vy = 0;
          }
        }
        if (hasMoved) onMovedRef.current();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [state.physicsEnabled]);
}
