import { useCallback } from "react";
import {
  createBoard as createBoardInStorage,
  deleteBoard as deleteBoardInStorage,
  loadBoards,
  loadNodesForBoard,
  renameBoard as renameBoardInStorage,
  saveNodesForBoard,
  setCurrentBoardId,
} from "../storage";
import type { Board } from "../types";
import { useMindStore } from "./use-mind-store";

function makeRootNode(boardId: string, name: string) {
  return {
    root: {
      id: "root",
      boardId,
      text: name,
      parentId: null,
      isRoot: true,
      completed: false,
      collapsed: false,
      priority: "medium" as const,
      categoryColor: "slate" as const,
      dueDate: "",
      children: [],
      x: 0,
      y: 0,
    },
  };
}

export interface BoardActions {
  createBoard: (name: string) => Promise<Board>;
  deleteBoard: (id: string) => Promise<void>;
  renameBoard: (id: string, name: string) => Promise<void>;
  switchBoard: (id: string) => Promise<void>;
  refreshBoards: () => Promise<void>;
}

export function useBoardActions(): BoardActions {
  const { state, dispatch } = useMindStore();

  const refreshBoards = useCallback(async () => {
    const boards = await loadBoards();
    dispatch({ boards, type: "SET_BOARDS" });
  }, [dispatch]);

  const createBoard = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Board name cannot be empty");
      const { board, rootId } = await createBoardInStorage(trimmed);
      const initialNodes = makeRootNode(board.id, trimmed);
      // Sanity: rootId should be "root"
      if (rootId !== "root") {
        throw new Error(`Unexpected rootId: ${rootId}`);
      }
      dispatch({ board, initialNodes, type: "ADD_BOARD" });
      await setCurrentBoardId(board.id);
      await refreshBoards();
      return board;
    },
    [dispatch, refreshBoards],
  );

  const renameBoard = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Board name cannot be empty");
      await renameBoardInStorage(id, trimmed);
      dispatch({ id, name: trimmed, type: "RENAME_BOARD" });
      await refreshBoards();
    },
    [dispatch, refreshBoards],
  );

  const deleteBoard = useCallback(
    async (id: string) => {
      const boards = await loadBoards();
      const remaining = boards.filter((b) => b.id !== id);
      const next = [...remaining].toSorted((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null;
      await deleteBoardInStorage(id);
      dispatch({ id, nextBoardId: next, type: "DELETE_BOARD" });
      await setCurrentBoardId(next);
      await refreshBoards();
    },
    [dispatch, refreshBoards],
  );

  const switchBoard = useCallback(
    async (id: string) => {
      // Flush any pending edits to the current board before switching
      // To avoid losing them when the save effect re-targets to the new board.
      try {
        if (state.currentBoardId && state.currentBoardId !== id) {
          await saveNodesForBoard(state.currentBoardId, state.nodes);
        }
      } finally {
        const nodes = await loadNodesForBoard(id);
        dispatch({ boardId: id, type: "SET_CURRENT_BOARD" });
        dispatch({ nodes, type: "SET_NODES" });
        dispatch({
          type: "SET_VIEW",
          view: { pan: { x: 0, y: 0 }, zoom: 1 },
        });
        await setCurrentBoardId(id);
      }
    },
    [dispatch, state.currentBoardId, state.nodes],
  );

  return { createBoard, deleteBoard, renameBoard, switchBoard, refreshBoards };
}
