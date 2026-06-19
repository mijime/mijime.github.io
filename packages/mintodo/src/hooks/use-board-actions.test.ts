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
    expect(result.current.store.state.currentBoardId).toBe(
      result.current.store.state.boards[0].id,
    );
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
    const id = result.current.store.state.boards[0].id;
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
    await act(async () => {
      await result.current.actions.createBoard("A");
    });
    const aId = result.current.store.state.boards[0].id;
    await act(async () => {
      await result.current.actions.createBoard("B");
    });
    const bId = result.current.store.state.boards[0].id;
    await act(async () => {
      await result.current.actions.deleteBoard(aId);
    });
    expect(result.current.store.state.boards.map((b) => b.id)).toEqual([bId]);
    expect(result.current.store.state.currentBoardId).toBe(bId);
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
    const id = result.current.store.state.boards[0].id;
    await act(async () => {
      await result.current.actions.deleteBoard(id);
    });
    expect(result.current.store.state.boards).toEqual([]);
    expect(result.current.store.state.currentBoardId).toBeNull();
    expect(result.current.store.state.nodes).toEqual({});
  });

  it("switchBoard loads nodes for the new board", async () => {
    const { result } = renderHook(
      () => ({
        actions: useBoardActions(),
        store: useMindStore(),
      }),
      { wrapper },
    );
    await act(async () => {
      await result.current.actions.createBoard("A");
    });
    const aId = result.current.store.state.boards[0].id;
    await act(async () => {
      await result.current.actions.createBoard("B");
    });
    const bId = result.current.store.state.boards[0].id;
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
});
