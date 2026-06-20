/* eslint-disable init-declarations */
import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import { MindProvider, useMindStore } from "./use-mind-store";
import { useBoardActions } from "./use-board-actions";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MindProvider, null, children);
}

beforeEach(async () => {
  await db.boards.clear();
  await db.nodes.clear();
  await db.meta.clear();
});

afterEach(async () => {
  await db.boards.clear();
  await db.nodes.clear();
  await db.meta.clear();
});

describe("useBoardActions", () => {
  it("createBoard adds a board and sets it as current", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    await act(async () => {
      await result.current.actions.createBoard("My Board");
    });
    expect(result.current.store.state.boards).toHaveLength(1);
    expect(result.current.store.state.boards[0].name).toBe("My Board");
    expect(result.current.store.state.currentBoardId).toBe(result.current.store.state.boards[0].id);
    expect(result.current.store.state.nodes.root).toBeDefined();
  });

  it("renameBoard updates the board name", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    await act(async () => {
      await result.current.actions.createBoard("Old");
    });
    const { id } = result.current.store.state.boards[0];
    await act(async () => {
      await result.current.actions.renameBoard(id, "New");
    });
    expect(result.current.store.state.boards[0].name).toBe("New");
  });

  it("deleteBoard removes the board and switches to next", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    let a: { id: string };
    let b: { id: string };
    await act(async () => {
      a = await result.current.actions.createBoard("A");
    });
    await act(async () => {
      b = await result.current.actions.createBoard("B");
    });
    await act(async () => {
      await result.current.actions.deleteBoard(a!.id);
    });
    expect(result.current.store.state.boards.map((b) => b.id)).toEqual([b!.id]);
    expect(result.current.store.state.currentBoardId).toBe(b!.id);
  });

  it("deleteBoard of the last board sets currentBoardId to null", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    await act(async () => {
      await result.current.actions.createBoard("Solo");
    });
    const { id } = result.current.store.state.boards[0];
    await act(async () => {
      await result.current.actions.deleteBoard(id);
    });
    expect(result.current.store.state.boards).toEqual([]);
    expect(result.current.store.state.currentBoardId).toBeNull();
    expect(result.current.store.state.nodes).toEqual({});
  });

  it("createBoard with empty name throws", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    await expect(async () => {
      await act(async () => {
        await result.current.actions.createBoard("");
      });
    }).rejects.toThrow("Board name cannot be empty");
  });

  it("createBoard with whitespace-only name throws", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    await expect(async () => {
      await act(async () => {
        await result.current.actions.createBoard("   ");
      });
    }).rejects.toThrow("Board name cannot be empty");
  });

  it("renameBoard with empty name throws", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    let board: { id: string };
    await act(async () => {
      board = await result.current.actions.createBoard("Valid");
    });
    await expect(async () => {
      await act(async () => {
        await result.current.actions.renameBoard(board!.id, "");
      });
    }).rejects.toThrow("Board name cannot be empty");
    // Board name should remain unchanged
    expect(result.current.store.state.boards[0].name).toBe("Valid");
  });

  it("switchBoard loads nodes for the new board", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    let a: { id: string };
    let b: { id: string };
    await act(async () => {
      a = await result.current.actions.createBoard("A");
    });
    await act(async () => {
      b = await result.current.actions.createBoard("B");
    });
    const aId = a!.id;
    const bId = b!.id;
    await act(async () => {
      await result.current.actions.switchBoard(aId);
    });
    expect(result.current.store.state.currentBoardId).toBe(aId);
    expect(result.current.store.state.nodes.root.boardId).toBe(aId);
    await act(async () => {
      await result.current.actions.switchBoard(bId);
    });
    expect(result.current.store.state.currentBoardId).toBe(bId);
    expect(result.current.store.state.nodes.root.boardId).toBe(bId);
  });

  it("switchBoard flushes pending edits before switching", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    let a: { id: string };
    let b: { id: string };
    await act(async () => {
      a = await result.current.actions.createBoard("A");
    });
    await act(async () => {
      b = await result.current.actions.createBoard("B");
    });
    // On board B now. Switch back to A.
    await act(async () => {
      await result.current.actions.switchBoard(a!.id);
    });
    expect(result.current.store.state.currentBoardId).toBe(a!.id);
    // Mutate the root node's text on board A
    await act(async () => {
      result.current.store.dispatch({
        id: "root",
        patch: { text: "Mutated" },
        type: "UPDATE_NODE",
      });
    });
    expect(result.current.store.state.nodes.root.text).toBe("Mutated");
    // Switch to board B — flush saves A's mutated nodes to storage
    await act(async () => {
      await result.current.actions.switchBoard(b!.id);
    });
    expect(result.current.store.state.currentBoardId).toBe(b!.id);
    // Switch back to board A — load from storage, mutation should persist
    await act(async () => {
      await result.current.actions.switchBoard(a!.id);
    });
    expect(result.current.store.state.currentBoardId).toBe(a!.id);
    expect(result.current.store.state.nodes.root.text).toBe("Mutated");
  });
});
