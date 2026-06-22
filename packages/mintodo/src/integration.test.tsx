import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { db } from "./db";

const flush = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe("board creation end-to-end", () => {
  afterEach(async () => {
    await db.delete();
  });

  it("creating a board switches view from EmptyState to Canvas", async () => {
    render(<App />);

    await act(async () => {
      await flush(100);
    });

    expect(screen.queryByText("最初のボードを作成")).toBeTruthy();
    expect(screen.queryByText("+ 新規ボード作成")).toBeTruthy();

    fireEvent.click(screen.getByText("+ 新規ボード作成"));

    expect(screen.queryByText("新しいボード")).toBeTruthy();

    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My Board" } });

    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });

    await act(async () => {
      await flush(300);
    });

    expect(screen.queryByText("新しいボード")).toBeNull();
    expect(screen.queryByText("最初のボードを作成")).toBeNull();
    expect(screen.queryByText("+ 新規ボード作成")).toBeNull();

    const boards = await db.boards.toArray();
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe("My Board");
  });
});

describe("inline edit end-to-end", () => {
  beforeEach(async () => {
    // Reopen after db.delete() from preceding describe blocks
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  it("dblclick on root opens inline editor; type DSL and save updates the node in DB", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // Dblclick on root to open inline editor
    const root = document.querySelector('[data-node-id="root"]') as HTMLElement;
    expect(root).toBeTruthy();
    await act(async () => {
      fireEvent.doubleClick(root);
    });
    const editor = document.querySelector("[data-inline-editor]");
    expect(editor).toBeTruthy();
    const ta = editor!.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("Test");

    // Type new text with DSL token
    await act(async () => {
      fireEvent.change(ta, { target: { value: "買い物 @priority:high" } });
    });
    await act(async () => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    // Editor should be gone, root text should be "買い物"
    expect(document.querySelector("[data-inline-editor]")).toBeNull();
    const rootAfter = document.querySelector('[data-node-id="root"]') as HTMLElement;
    expect(rootAfter.textContent).toContain("買い物");
    expect(rootAfter.textContent).not.toContain("@priority");

    // Verify in DB
    const nodes = await db.nodes.toArray();
    const rootNode = nodes.find((n) => n.isRoot);
    expect(rootNode).toBeTruthy();
    expect(rootNode!.text).toBe("買い物");
    expect(rootNode!.priority).toBe("high");
  });

  it("pressing Tab on the root creates a new child and auto-opens inline editor with empty text", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // Focus the body and press Tab while root is selected
    const root = document.querySelector('[data-node-id="root"]') as HTMLElement;
    expect(root).toBeTruthy();
    await act(async () => {
      // SELECT root
      fireEvent.click(root);
    });
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Tab" });
    });
    await act(async () => {
      await flush(500);
    });

    // New child node should exist, editor should be open with empty text
    const editor = document.querySelector("[data-inline-editor]");
    expect(editor).toBeTruthy();
    const ta = editor!.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("");

    // Pressing Esc on empty new node should delete it (CANCEL_INLINE_EDIT on pending creation)
    await act(async () => {
      fireEvent.keyDown(ta, { key: "Escape" });
    });
    await act(async () => {
      await flush(500);
    });
    expect(document.querySelector("[data-inline-editor]")).toBeNull();

    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });

  it("saving an empty inline edit deletes the existing node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // Focus root and press Tab to create a child
    const root = document.querySelector('[data-node-id="root"]') as HTMLElement;
    await act(async () => {
      fireEvent.click(root);
    });
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Tab" });
    });
    await act(async () => {
      await flush(500);
    });

    // Type text then save (so the node becomes a regular child, not pending)
    const ta1 = document.querySelector("[data-inline-editor] textarea") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(ta1, { target: { value: "real task" } });
    });
    await act(async () => {
      fireEvent.keyDown(ta1, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });
    expect(document.querySelector("[data-inline-editor]")).toBeNull();

    // Re-open inline editor on that child and clear text + save → should delete
    const child = document.querySelector('[data-node-id^="node-"]') as HTMLElement;
    expect(child).toBeTruthy();
    await act(async () => {
      fireEvent.doubleClick(child);
    });
    const ta2 = document.querySelector("[data-inline-editor] textarea") as HTMLTextAreaElement;
    expect(ta2.value).toBe("real task");
    await act(async () => {
      fireEvent.change(ta2, { target: { value: "" } });
    });
    await act(async () => {
      fireEvent.keyDown(ta2, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });
});

describe("centering on new node", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  it("adding a child pans the camera to center on that child", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    // Create a board
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // Confirm initial transform has no y-pan (x≈0 too, but FP may produce ~1e-14)
    const container = document.querySelector(".transform-container") as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.style.transform).toMatch(/translate\(.*?0px\)/u);

    // Click the root's + button (data-testid="add-child-root") to add a child
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    expect(addBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(500);
    });

    // The new child is placed at (≈0, -240) by the radial layout (RING=240, single child above root).
    // ComputeCenterOnNode returns pan ≈ (0, 240) at zoom=1. (x may be ~1e-14 due to FP precision)
    expect(container.style.transform).toMatch(/translate\(.*?240px\)/u);
  });
});
