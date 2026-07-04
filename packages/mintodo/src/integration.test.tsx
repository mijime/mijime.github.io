import "fake-indexeddb/auto";
import type { Collision, CollisionDetection, DroppableContainer } from "@dnd-kit/core";
import type * as DndKit from "@dnd-kit/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { App } from "./App";
import { db } from "./db";

const flush = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const collisionRef = vi.hoisted(() => ({
  value: undefined as CollisionDetection | undefined,
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof DndKit;
  interface DndProps {
    children?: ReactNode;
    collisionDetection?: CollisionDetection;
    [key: string]: unknown;
  }
  const WrappedDndContext = (props: DndProps) => {
    const cd = collisionRef.value ?? props.collisionDetection;
    return (
      <actual.DndContext {...props} collisionDetection={cd}>
        {props.children}
      </actual.DndContext>
    );
  };
  return { ...actual, DndContext: WrappedDndContext };
});

function pointerRectCollision(): CollisionDetection {
  return ({
    droppableContainers,
    pointerCoordinates,
  }: {
    droppableContainers: DroppableContainer[];
    pointerCoordinates: { x: number; y: number } | null;
  }) => {
    if (!pointerCoordinates) return [];
    const out: Collision[] = [];
    for (const c of droppableContainers) {
      const node = c.node.current;
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (
        pointerCoordinates.x >= rect.left &&
        pointerCoordinates.x <= rect.right &&
        pointerCoordinates.y >= rect.top &&
        pointerCoordinates.y <= rect.bottom
      ) {
        out.push({ id: c.id, data: { droppableContainer: c } });
      }
    }
    return out;
  };
}

function setRect(el: HTMLElement, x: number) {
  el.getBoundingClientRect = () => ({
    x,
    y: 0,
    width: 288,
    height: 400,
    top: 0,
    right: x + 288,
    bottom: 400,
    left: x,
    toJSON: () => null,
  });
}

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

describe("modal-based edit end-to-end", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  async function createBoard(name: string): Promise<void> {
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: name } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });
  }

  it("clicking the root + button opens an inline input", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    expect(addBtn).toBeTruthy();
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const input = await screen.findByTestId("inline-edit-input");
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("entering text in inline input creates a node and centers the camera", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const ta = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(ta, { target: { value: "my task" } });
    });
    await act(() => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    // Inline input should be gone
    expect(screen.queryByTestId("inline-edit-input")).toBeNull();

    // Node created in DB
    const nodes = await db.nodes.toArray();
    const child = nodes.find((n) => !n.isRoot);
    expect(child).toBeTruthy();
    expect(child!.text).toBe("my task");

    // Camera centered on new node (x-pan ≈ 360 at zoom=1)
    const container = document.querySelector(".transform-container") as HTMLElement;
    expect(container.style.transform).toMatch(/translate\([^)]*360px/u);
  });

  it("committing inline input with empty text does not create a node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    expect(screen.queryByTestId("inline-edit-input")).toBeNull();
    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });

  it("canceling inline input via Escape does not create a node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "some text" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Escape" });
    });
    await act(async () => {
      await flush(500);
    });

    expect(screen.queryByTestId("inline-edit-input")).toBeNull();
    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });

  it("clicking the ellipsis on a child node opens the edit modal", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    // Add a child via inline input
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "my task" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    // Find the ellipsis button on the child node
    const ellipsisBtns = document.querySelectorAll('[data-testid="ellipsis"]');
    expect(ellipsisBtns.length).toBeGreaterThan(0);
    await act(() => {
      fireEvent.click(ellipsisBtns[0]);
    });
    await act(async () => {
      await flush(100);
    });

    const modal = document.querySelector('[data-testid="edit-modal"]');
    expect(modal).toBeTruthy();
    const modalTa = modal!.querySelector("textarea") as HTMLTextAreaElement;
    expect(modalTa.value).toBe("my task");
  });

  it("editing via modal applies DSL changes (priority, text cleaned)", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    // Add a child via inline input
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "initial" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    // Open edit modal via ellipsis
    const ellipsisBtns = document.querySelectorAll('[data-testid="ellipsis"]');
    await act(() => {
      fireEvent.click(ellipsisBtns[0]);
    });
    await act(async () => {
      await flush(100);
    });

    const editTa = document.querySelector(
      '[data-testid="edit-modal-textarea"]',
    ) as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(editTa, { target: { value: "newtext @priority:high" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
    });
    await act(async () => {
      await flush(500);
    });

    const nodes = await db.nodes.toArray();
    const child = nodes.find((n) => !n.isRoot);
    expect(child).toBeTruthy();
    expect(child!.text).toBe("newtext");
    expect(child!.priority).toBe("high");
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
    const boardInput = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(boardInput, { target: { value: "Test" } });
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

    // Click the root's + button (data-testid="add-child-root") to open inline input
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    expect(addBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });

    // Type text and press Enter
    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "my task" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    // The new child is placed at (360, 0) by the tree layout (one depth level right, single child centered vertically).
    // ComputeCenterOnNode returns pan ≈ (-360, 0) at zoom=1. (x may be ~1e-14 due to FP precision)
    expect(container.style.transform).toMatch(/translate\([^)]*360px/u);
  });
});

describe("kanban view end-to-end", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  async function createBoard(name: string): Promise<void> {
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: name } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });
  }

  it("toggles between mindmap and kanban view", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");
    // Mindmap visible
    expect(screen.queryByTestId("kanban-board")).toBeNull();
    // Switch to kanban
    await act(() => {
      fireEvent.click(screen.getByTestId("view-mode-kanban"));
    });
    expect(screen.getByTestId("kanban-board")).toBeTruthy();
    // Switch back
    await act(() => {
      fireEvent.click(screen.getByTestId("view-mode-mindmap"));
    });
    expect(screen.queryByTestId("kanban-board")).toBeNull();
  });

  it("kanban view shows 4 columns", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");
    await act(() => {
      fireEvent.click(screen.getByTestId("view-mode-kanban"));
    });
    expect(screen.getByTestId("kanban-column-inbox")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-wip")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-review")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-done")).toBeTruthy();
    const count = screen.getByTestId("kanban-column-count-inbox").textContent;
    expect(count).toBe("0");
  });

  it("viewMode round-trips through IndexedDB meta", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");
    const boards = await db.boards.toArray();
    const boardId = boards.at(-1)!.id;
    // Mindmap default — no meta key yet
    expect(await db.meta.get(`viewMode:${boardId}`)).toBeUndefined();
    // Toggle to kanban
    await act(() => {
      fireEvent.click(screen.getByTestId("view-mode-kanban"));
    });
    // Wait for debounce save
    await act(async () => {
      await flush(400);
    });
    const meta = await db.meta.get(`viewMode:${boardId}`);
    expect(meta?.value).toBe("kanban");
  });

  it("dragging a card between columns changes its status", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    // Add a child node (will have status "inbox")
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });
    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "drag me" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(500);
    });

    // Switch to kanban view
    await act(() => {
      fireEvent.click(screen.getByTestId("view-mode-kanban"));
    });
    await act(async () => {
      await flush(100);
    });

    collisionRef.value = pointerRectCollision();
    try {
      const inboxColumn = screen.getByTestId("kanban-column-inbox");
      const wipColumn = screen.getByTestId("kanban-column-wip");
      const reviewColumn = screen.getByTestId("kanban-column-review");
      const doneColumn = screen.getByTestId("kanban-column-done");

      const cards = inboxColumn.querySelectorAll("[data-node-id]") as NodeListOf<HTMLElement>;
      const childCard = [...cards].find((c) => c.dataset.nodeId !== "root");
      expect(childCard).toBeTruthy();

      setRect(inboxColumn, 0);
      setRect(wipColumn, 304);
      setRect(reviewColumn, 608);
      setRect(doneColumn, 912);

      const cardRect = childCard!.getBoundingClientRect();
      const fromX = cardRect.left + cardRect.width / 2;
      const fromY = cardRect.top + cardRect.height / 2;
      const doneRect = doneColumn.getBoundingClientRect();
      const toX = doneRect.left + doneRect.width / 2;
      const toY = doneRect.top + doneRect.height / 2;
      const doc = childCard!.ownerDocument;

      await act(async () => {
        fireEvent.pointerDown(childCard!, {
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 1,
          clientX: fromX,
          clientY: fromY,
        });
      });
      await act(async () => {
        doc.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            clientX: fromX + 10,
            clientY: fromY + 10,
            buttons: 1,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await act(async () => {
        doc.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            clientX: toX,
            clientY: toY,
            buttons: 1,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await act(async () => {
        doc.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            clientX: toX,
            clientY: toY,
            button: 0,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await act(async () => {
        await flush(100);
      });

      expect(screen.getByTestId("kanban-column-count-inbox").textContent).toBe("0");
      expect(screen.getByTestId("kanban-column-count-done").textContent).toBe("1");
    } finally {
      collisionRef.value = undefined;
    }
  });
});

describe("canvas background uses --paper", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("renders the canvas container with bg-[var(--paper)] (no slate-50)", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    if (screen.queryByText("+ 新規ボード作成")) {
      await act(() => {
        fireEvent.click(screen.getByText("+ 新規ボード作成"));
      });
      const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
      await act(() => {
        fireEvent.change(input, { target: { value: "Bg" } });
      });
      await act(() => {
        fireEvent.click(screen.getByText("作成"));
      });
      await act(async () => {
        await flush(300);
      });
    }

    const canvasContainer = document.querySelector(".canvas-grid") as HTMLElement;
    expect(canvasContainer).toBeTruthy();
    expect(canvasContainer.className).toContain("bg-[var(--paper)]");
    expect(canvasContainer.className).not.toContain("bg-slate-50");
    expect(canvasContainer.className).not.toContain("dark:bg-slate-900");
  });
});

describe("multi-line text end-to-end", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("preserves newlines from the edit modal to the mindmap card", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    if (screen.queryByText("+ 新規ボード作成")) {
      await act(() => {
        fireEvent.click(screen.getByText("+ 新規ボード作成"));
      });
      const boardInput = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
      await act(() => {
        fireEvent.change(boardInput, { target: { value: "Multi" } });
      });
      await act(() => {
        fireEvent.click(screen.getByText("作成"));
      });
      await act(async () => {
        await flush(300);
      });
    }

    await act(() => {
      fireEvent.click(screen.getByTestId("add-child-root"));
    });
    await act(async () => {
      await flush(100);
    });

    const multiline = "first\nsecond\nthird line is a bit longer to force wrap";
    const inlineInput = await screen.findByTestId("inline-edit-input");
    // Create a simple single-line task via inline input
    await act(() => {
      fireEvent.change(inlineInput, { target: { value: "simple task" } });
    });
    await act(() => {
      fireEvent.keyDown(inlineInput, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Now edit it via modal to add multiline text
    const ellipsisBtns = document.querySelectorAll('[data-testid="ellipsis"]');
    await act(() => {
      fireEvent.click(ellipsisBtns[0]);
    });
    await act(async () => {
      await flush(100);
    });

    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: multiline } });
    });
    await act(() => {
      fireEvent.click(screen.getByText("保存"));
    });
    await act(async () => {
      await flush(300);
    });

    const textSpan = document.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(textSpan).toBeTruthy();
    expect(textSpan.textContent).toBe(multiline);
  });
});

describe("collapse +N badge and c-key toggle", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  afterEach(async () => {
    await db.delete();
  });

  async function createBoardWithHierarchy(): Promise<void> {
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // Get root node
    const nodes1 = await db.nodes.toArray();
    const root = nodes1.find((n) => n.isRoot);
    if (!root) return;

    // Add parent node via root + button
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });

    const ta1 = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(ta1, { target: { value: "parent" } });
    });
    await act(() => {
      fireEvent.keyDown(ta1, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Get parent node ID from DB and add 2 children
    const nodes = await db.nodes.toArray();
    const parentNode = nodes.find((n) => n.text === "parent");
    if (!parentNode) return;

    // Add child1 by selecting parent and clicking Tab
    await act(() => {
      const parentCard = document.querySelector(`[data-node-id="${parentNode.id}"]`) as HTMLElement;
      if (parentCard) fireEvent.click(parentCard);
    });
    await act(async () => {
      await flush(100);
    });
    await act(() => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    await act(async () => {
      await flush(100);
    });
    const ta2 = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(ta2, { target: { value: "child1" } });
    });
    await act(() => {
      fireEvent.keyDown(ta2, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Add child2
    await act(() => {
      const parentCard2 = document.querySelector(
        `[data-node-id="${parentNode.id}"]`,
      ) as HTMLElement;
      if (parentCard2) fireEvent.click(parentCard2);
    });
    await act(async () => {
      await flush(100);
    });
    await act(() => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    await act(async () => {
      await flush(100);
    });
    const ta3 = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(ta3, { target: { value: "child2" } });
    });
    await act(() => {
      fireEvent.keyDown(ta3, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });
  }

  it("shows +N badge with hidden descendant count when collapsed", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithHierarchy();

    const nodes = await db.nodes.toArray();
    const parentNode = nodes.find((n) => n.text === "parent");
    expect(parentNode).toBeTruthy();

    // Select parent and find collapse button
    await act(() => {
      const parentCard = document.querySelector(
        `[data-node-id="${parentNode!.id}"]`,
      ) as HTMLElement;
      if (parentCard) fireEvent.click(parentCard);
    });
    await act(async () => {
      await flush(100);
    });

    const collapseBtn = document.querySelector(
      `[data-testid="collapse-${parentNode!.id}"]`,
    ) as HTMLElement;
    expect(collapseBtn).toBeTruthy();

    await act(() => {
      if (collapseBtn) fireEvent.click(collapseBtn);
    });
    await act(async () => {
      await flush(100);
    });

    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("toggles collapse on selected node with the c key", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithHierarchy();

    const nodes = await db.nodes.toArray();
    const parentNode = nodes.find((n) => n.text === "parent");
    expect(parentNode).toBeTruthy();

    // Select parent
    await act(() => {
      const parentCard = document.querySelector(
        `[data-node-id="${parentNode!.id}"]`,
      ) as HTMLElement;
      if (parentCard) fireEvent.click(parentCard);
    });
    await act(async () => {
      await flush(100);
    });

    // Press c to collapse
    await act(() => {
      fireEvent.keyDown(document, { key: "c" });
    });
    await act(async () => {
      await flush(100);
    });
    expect(screen.getByText("+2")).toBeTruthy();

    // Press c again to expand
    await act(() => {
      fireEvent.keyDown(document, { key: "c" });
    });
    await act(async () => {
      await flush(100);
    });
    expect(screen.queryByText("+2")).toBeNull();
  });
});

describe("inline editing UI", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  afterEach(async () => {
    await db.delete();
  });

  async function createBoardWithRoot() {
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });
  }

  it("Tab creates a child with an inline input; Enter commits", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithRoot();

    // Get root node
    const nodes = await db.nodes.toArray();
    const root = nodes.find((n) => n.isRoot);
    expect(root).toBeTruthy();

    // Select root
    await act(() => {
      const rootCard = document.querySelector(`[data-node-id="${root!.id}"]`) as HTMLElement;
      if (rootCard) fireEvent.click(rootCard);
    });
    await act(async () => {
      await flush(100);
    });

    // Press Tab to create child inline
    await act(() => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    await act(async () => {
      await flush(100);
    });

    const input = await screen.findByTestId("inline-edit-input");
    expect(input).toBeTruthy();

    // Type text and press Enter
    await act(() => {
      fireEvent.change(input, { target: { value: "new task" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    expect(screen.queryByTestId("inline-edit-input")).toBeNull();
    expect(screen.getByText("new task")).toBeTruthy();
  });

  it("Escape cancels and removes the empty new node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithRoot();

    const nodes = await db.nodes.toArray();
    const root = nodes.find((n) => n.isRoot);
    expect(root).toBeTruthy();

    await act(() => {
      const rootCard = document.querySelector(`[data-node-id="${root!.id}"]`) as HTMLElement;
      if (rootCard) fireEvent.click(rootCard);
    });
    await act(async () => {
      await flush(100);
    });

    await act(() => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    await act(async () => {
      await flush(100);
    });

    const input = await screen.findByTestId("inline-edit-input");

    await act(() => {
      fireEvent.keyDown(input, { key: "Escape" });
    });
    await act(async () => {
      await flush(300);
    });

    expect(screen.queryByTestId("inline-edit-input")).toBeNull();
  });

  it("Enter on a selected child creates a sibling inline", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithRoot();

    // Add a child via root + button
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });

    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "childA" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Get childA and select it
    const nodes = await db.nodes.toArray();
    const childA = nodes.find((n) => n.text === "childA");
    expect(childA).toBeTruthy();

    await act(() => {
      const childCard = document.querySelector(`[data-node-id="${childA!.id}"]`) as HTMLElement;
      if (childCard) fireEvent.click(childCard);
    });
    await act(async () => {
      await flush(100);
    });

    // Press Enter to create sibling
    await act(() => {
      fireEvent.keyDown(document, { key: "Enter" });
    });
    await act(async () => {
      await flush(100);
    });

    const siblingInput = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(siblingInput, { target: { value: "sibling" } });
    });
    await act(() => {
      fireEvent.keyDown(siblingInput, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    expect(screen.getByText("sibling")).toBeTruthy();
  });

  it("F2 renames the selected node inline", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithRoot();

    // Add a node to rename
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });

    const input = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(input, { target: { value: "old" } });
    });
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Select the node and press F2
    const nodes = await db.nodes.toArray();
    const node = nodes.find((n) => n.text === "old");
    expect(node).toBeTruthy();

    await act(() => {
      const nodeCard = document.querySelector(`[data-node-id="${node!.id}"]`) as HTMLElement;
      if (nodeCard) fireEvent.click(nodeCard);
    });
    await act(async () => {
      await flush(100);
    });

    await act(() => {
      fireEvent.keyDown(document, { key: "F2" });
    });
    await act(async () => {
      await flush(100);
    });

    const editInput = await screen.findByTestId("inline-edit-input");
    expect((editInput as HTMLInputElement).value).toBe("old");

    await act(() => {
      fireEvent.change(editInput, { target: { value: "renamed" } });
    });
    await act(() => {
      fireEvent.keyDown(editInput, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    expect(screen.getByText("renamed")).toBeTruthy();
    expect(screen.queryByText("old")).toBeNull();
  });

  it("does not trigger global shortcuts while editing", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithRoot();

    const nodes = await db.nodes.toArray();
    const root = nodes.find((n) => n.isRoot);
    expect(root).toBeTruthy();

    await act(() => {
      const rootCard = document.querySelector(`[data-node-id="${root!.id}"]`) as HTMLElement;
      if (rootCard) fireEvent.click(rootCard);
    });
    await act(async () => {
      await flush(100);
    });

    await act(() => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    await act(async () => {
      await flush(100);
    });

    const input = await screen.findByTestId("inline-edit-input");

    // Type with spaces (space key should not trigger TOGGLE_COMPLETE)
    await act(() => {
      fireEvent.change(input, { target: { value: "a b" } });
    });

    // Verify the typed text is in the input
    expect((input as HTMLInputElement).value).toBe("a b");

    // Verify by pressing space key directly doesn't toggle anything
    await act(() => {
      fireEvent.keyDown(input, { key: " " });
    });
    await act(async () => {
      await flush(100);
    });

    // Check that the node's completed state is unchanged (space didn't trigger TOGGLE_COMPLETE)
    const dbNodes = await db.nodes.toArray();
    const rootNode = dbNodes.find((n) => n.isRoot);
    expect(rootNode?.completed).toBeFalsy();
  });
});

describe("arrow navigation (horizontal tree)", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
  });

  afterEach(async () => {
    await db.delete();
  });

  async function createBoardWithArrowStructure(): Promise<void> {
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // Add node "a" as child of root
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });

    const ta1 = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(ta1, { target: { value: "a" } });
    });
    await act(() => {
      fireEvent.keyDown(ta1, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Add node "b" as sibling of "a"
    const addBtn2 = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn2);
    });
    await act(async () => {
      await flush(100);
    });

    const ta2 = await screen.findByTestId("inline-edit-input");
    await act(() => {
      fireEvent.change(ta2, { target: { value: "b" } });
    });
    await act(() => {
      fireEvent.keyDown(ta2, { key: "Enter" });
    });
    await act(async () => {
      await flush(300);
    });

    // Add node "a1" as child of "a"
    const nodes = await db.nodes.toArray();
    const nodeA = nodes.find((n) => n.text === "a");
    if (nodeA) {
      await act(() => {
        const aCard = document.querySelector(`[data-node-id="${nodeA.id}"]`) as HTMLElement;
        if (aCard) fireEvent.click(aCard);
      });
      await act(async () => {
        await flush(100);
      });

      await act(() => {
        fireEvent.keyDown(document, { key: "Tab" });
      });
      await act(async () => {
        await flush(100);
      });

      const ta3 = await screen.findByTestId("inline-edit-input");
      await act(() => {
        fireEvent.change(ta3, { target: { value: "a1" } });
      });
      await act(() => {
        fireEvent.keyDown(ta3, { key: "Enter" });
      });
      await act(async () => {
        await flush(300);
      });
    }
  }

  it("Right selects first child, Left selects parent", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithArrowStructure();

    const nodes = await db.nodes.toArray();
    const nodeA = nodes.find((n) => n.text === "a");
    const nodeA1 = nodes.find((n) => n.text === "a1");
    expect(nodeA).toBeTruthy();
    expect(nodeA1).toBeTruthy();

    // Select "a"
    await act(() => {
      const aCard = document.querySelector(`[data-node-id="${nodeA!.id}"]`) as HTMLElement;
      if (aCard) fireEvent.click(aCard);
    });
    await act(async () => {
      await flush(100);
    });

    expect(document.querySelector(`#node-dom-${nodeA!.id}`)?.className).toContain("node-selected");

    // Press Right to select first child "a1"
    await act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    await act(async () => {
      await flush(50);
    });

    expect(document.querySelector(`#node-dom-${nodeA1!.id}`)?.className).toContain("node-selected");

    // Press Left to select parent "a"
    await act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    await act(async () => {
      await flush(50);
    });

    expect(document.querySelector(`#node-dom-${nodeA!.id}`)?.className).toContain("node-selected");
  });

  it("Down/Up move between siblings", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoardWithArrowStructure();

    const nodes = await db.nodes.toArray();
    const nodeA = nodes.find((n) => n.text === "a");
    const nodeB = nodes.find((n) => n.text === "b");
    expect(nodeA).toBeTruthy();
    expect(nodeB).toBeTruthy();

    // Select "a"
    await act(() => {
      const aCard = document.querySelector(`[data-node-id="${nodeA!.id}"]`) as HTMLElement;
      if (aCard) fireEvent.click(aCard);
    });
    await act(async () => {
      await flush(100);
    });

    expect(document.querySelector(`#node-dom-${nodeA!.id}`)?.className).toContain("node-selected");

    // Press Down to select sibling "b"
    await act(() => {
      fireEvent.keyDown(window, { key: "ArrowDown" });
    });
    await act(async () => {
      await flush(50);
    });

    expect(document.querySelector(`#node-dom-${nodeB!.id}`)?.className).toContain("node-selected");

    // Press Up to select sibling "a"
    await act(() => {
      fireEvent.keyDown(window, { key: "ArrowUp" });
    });
    await act(async () => {
      await flush(50);
    });

    expect(document.querySelector(`#node-dom-${nodeA!.id}`)?.className).toContain("node-selected");
  });
});
