import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";
import { computeCenterOnNode } from "../view";

export function useCenterOnNewNode(): void {
  const { state, dispatch } = useMindStore();
  const prevNodeIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentIds = new Set(Object.keys(state.nodes));
    if (prevNodeIdsRef.current === null) {
      prevNodeIdsRef.current = currentIds;
      return;
    }
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevNodeIdsRef.current.has(id)) newIds.push(id);
    }
    if (newIds.length === 1) {
      const newNode = state.nodes[newIds[0]];
      if (newNode) {
        dispatch({ type: "SET_VIEW", view: computeCenterOnNode(newNode, state.view.zoom) });
      }
    }
    prevNodeIdsRef.current = currentIds;
  }, [state.nodes, state.view.zoom, dispatch]);
}
