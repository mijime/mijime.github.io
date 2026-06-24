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

  it("clicking the root + button opens the create modal", async () => {
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
    const modal = document.querySelector('[data-testid="edit-modal"]');
    expect(modal).toBeTruthy();
    const ta = modal!.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("");
  });

  it("saving the create modal with DSL creates a node and centers the camera", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: "買い物 @priority:high" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
    });
    await act(async () => {
      await flush(500);
    });

    // Modal should be gone
    expect(document.querySelector('[data-testid="edit-modal"]')).toBeNull();

    // Node created in DB
    const nodes = await db.nodes.toArray();
    const child = nodes.find((n) => !n.isRoot);
    expect(child).toBeTruthy();
    expect(child!.text).toBe("買い物");
    expect(child!.priority).toBe("high");

    // Camera centered on new node (y-pan ≈ 240 at zoom=1)
    const container = document.querySelector(".transform-container") as HTMLElement;
    expect(container.style.transform).toMatch(/translate\(.*?240px\)/u);
  });

  it("saving the create modal with empty text and no DSL closes the modal and does not create a node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
    });
    await act(async () => {
      await flush(500);
    });

    expect(document.querySelector('[data-testid="edit-modal"]')).toBeNull();
    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });

  it("canceling the create modal does not create a node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: "some text" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-cancel"]') as HTMLButtonElement,
      );
    });
    await act(async () => {
      await flush(500);
    });

    expect(document.querySelector('[data-testid="edit-modal"]')).toBeNull();
    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });

  it("clicking the ellipsis on a child node opens the edit modal", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    await createBoard("Test");

    // Add a child via the modal
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: "my task" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
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

    // Add a child
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    const ta1 = document.querySelector(
      '[data-testid="edit-modal-textarea"]',
    ) as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta1, { target: { value: "initial" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
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

    // Click the root's + button (data-testid="add-child-root") to open the create modal
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    expect(addBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      await flush(100);
    });

    // Type text and click save
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: "my task" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
    });
    await act(async () => {
      await flush(500);
    });

    // The new child is placed at (≈0, -240) by the radial layout (RING=240, single child above root).
    // ComputeCenterOnNode returns pan ≈ (0, 240) at zoom=1. (x may be ~1e-14 due to FP precision)
    expect(container.style.transform).toMatch(/translate\(.*?240px\)/u);
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

  it("kanban view shows 4 columns with the root in inbox", async () => {
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
    expect(count).toBe("1");
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
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: "drag me" } });
    });
    await act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement,
      );
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

      expect(screen.getByTestId("kanban-column-count-inbox").textContent).toBe("1");
      expect(screen.getByTestId("kanban-column-count-done").textContent).toBe("1");
    } finally {
      collisionRef.value = undefined;
    }
  });
});
