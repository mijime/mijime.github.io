import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { db } from "./db";

const flush = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// Jsdom doesn't implement DataTransfer
class MockDataTransfer {
  private data = new Map<string, string>();
  public types: string[] = [];
  public effectAllowed = "move";
  public dropEffect = "move";

  public setData(format: string, data: string): void {
    this.data.set(format, data);
    if (!this.types.includes(format)) {
      this.types.push(format);
    }
  }

  public getData(format: string): string {
    return this.data.get(format) ?? "";
  }
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
    const boardId = boards.at(-1).id;
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

    // Add a child node
    const addBtn = document.querySelector('[data-testid="add-child-root"]') as HTMLElement;
    await act(() => {
      fireEvent.click(addBtn);
    });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    await act(() => {
      fireEvent.change(ta, { target: { value: "drag test" } });
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

    // Card should be in inbox column (need the child, not root)
    const inboxColumn = screen.getByTestId("kanban-column-inbox");
    const cards = inboxColumn.querySelectorAll("[data-node-id]") as NodeListOf<HTMLElement>;
    const childCard = [...cards].find((c) => c.dataset.nodeId !== "root");
    expect(childCard).toBeTruthy();
    const { nodeId } = childCard!.dataset;
    expect(nodeId).toBeTruthy();

    // Drag the child card to the done column
    const doneColumn = screen.getByTestId("kanban-column-done");
    const dt = new MockDataTransfer();
    dt.setData("application/x-mindnode-id", nodeId!);

    await act(() => {
      fireEvent.drop(doneColumn, { dataTransfer: dt as unknown as DataTransfer });
    });
    await act(async () => {
      await flush(100);
    });

    // Card should now be in done column, not inbox
    expect(screen.getByTestId("kanban-column-count-inbox").textContent).toBe("1");
    expect(screen.getByTestId("kanban-column-count-done").textContent).toBe("1");
  });
});
