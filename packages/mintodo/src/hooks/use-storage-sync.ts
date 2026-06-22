import { useEffect, useRef } from "react";
import {
  discardV1Data,
  getCurrentBoardId,
  hasV1Data,
  loadBoards,
  loadNodesForBoard,
  saveNodesForBoard,
  setCurrentBoardId,
} from "../storage";
import { useMindStore } from "./use-mind-store";

const SAVE_DEBOUNCE_MS = 300;

export function useStorageSync(): void {
  const { dispatch, state } = useMindStore();
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (await hasV1Data()) {
          await discardV1Data();
        }
        const boards = await loadBoards();
        dispatch({ boards, type: "SET_BOARDS" });
        const currentId = await getCurrentBoardId();
        if (currentId && boards.some((b) => b.id === currentId)) {
          dispatch({ boardId: currentId, type: "SET_CURRENT_BOARD" });
          const nodes = await loadNodesForBoard(currentId);
          dispatch({ nodes, type: "SET_NODES" });
        } else {
          await setCurrentBoardId(null);
          dispatch({ boardId: null, type: "SET_CURRENT_BOARD" });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("mintodo: failed to load from IndexedDB, using initial state", err);
      } finally {
        loadedRef.current = true;
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (state.currentBoardId) {
        saveNodesForBoard(state.currentBoardId, state.nodes).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error("mintodo: failed to save nodes", err);
        });
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.nodes, state.currentBoardId]);
}
