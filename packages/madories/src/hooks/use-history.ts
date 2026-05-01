import { useCallback, useEffect, useRef, useState } from "react";
import { reducer } from "../store";
import type { Building } from "../types";

const MAX_HISTORY = 50;
const MERGE_MS = 500;

export interface AppState {
  building: Building;
  activeFloorId: string;
}

export function useHistory(initialState: AppState) {
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const current = history[historyIndex];

  const lastActionRef = useRef<{
    type: string;
    floorId?: string;
    t: number;
  } | null>(null);

  const push = useCallback(
    (next: AppState) => {
      lastActionRef.current = null;
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        const newHistory = [...truncated, next];
        return newHistory.length > MAX_HISTORY ? newHistory.slice(-MAX_HISTORY) : newHistory;
      });
      setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
    },
    [historyIndex],
  );

  const dispatch = useCallback(
    (action: Parameters<typeof reducer>[1]) => {
      const now = Date.now();
      const last = lastActionRef.current;
      const floorId = "floorId" in action ? action.floorId : undefined;
      const canMerge =
        last !== null &&
        last.type === action.type &&
        last.floorId === floorId &&
        now - last.t < MERGE_MS;

      lastActionRef.current = { floorId, t: now, type: action.type };

      if (canMerge) {
        setHistory((prev) => {
          const cur = prev[historyIndex];
          const next = { ...cur, building: reducer(cur.building, action) };
          const updated = [...prev];
          updated[historyIndex] = next;
          return updated;
        });
      } else {
        setHistory((prev) => {
          const cur = prev[historyIndex];
          const next = { ...cur, building: reducer(cur.building, action) };
          const truncated = prev.slice(0, historyIndex + 1);
          const newHistory = [...truncated, next];
          return newHistory.length > MAX_HISTORY ? newHistory.slice(-MAX_HISTORY) : newHistory;
        });
        setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
      }
    },
    [historyIndex],
  );

  const setActiveFloorId = (id: string) => {
    setHistory((prev) => {
      const cur = prev[historyIndex];
      const updated = [...prev];
      updated[historyIndex] = { ...cur, activeFloorId: id };
      return updated;
    });
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => setHistoryIndex((i) => Math.max(0, i - 1)), []);
  const redo = useCallback(
    () => setHistoryIndex((i) => Math.min(history.length - 1, i + 1)),
    [history.length],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        setHistoryIndex((i) => Math.max(0, i - 1));
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history.length]);

  return { canRedo, canUndo, current, dispatch, push, redo, setActiveFloorId, undo };
}
