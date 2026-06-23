import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dispatch } from "react";
import { EditModal } from "./EditModal";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type Action, type State } from "../store";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId,
    isRoot: parentId === null,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: opts.children ?? [],
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    ...opts,
  };
}

function makeState(): State {
  return {
    boards: [],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    viewMode: "mindmap",
    nodes: {
      root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
      a: makeNode("a", "root", { text: "Task A", priority: "low", categoryColor: "sky" }),
    },
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

let capturedDispatch: Dispatch<Action> | null = null;
let capturedState: State | null = null;

function Capture() {
  capturedState = useMindStore().state;
  capturedDispatch = useMindStore().dispatch;
  return null;
}

function setup(stateOverrides?: Partial<State>) {
  const s = { ...makeState(), ...stateOverrides };
  capturedState = null;
  return render(
    <MindProvider initialState={s}>
      <Capture />
      <EditModal />
    </MindProvider>,
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("EditModal", () => {
  it("renders the modal when state.modal is edit kind", () => {
    const { container } = setup({ modal: { kind: "edit", nodeId: "a" } });
    expect(container.querySelector('[data-testid="edit-modal"]')).toBeTruthy();
    const ta = container.querySelector(
      '[data-testid="edit-modal-textarea"]',
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("Task A");
  });

  it("renders the modal with empty text when state.modal is edit-new kind", () => {
    const { container } = setup({ modal: { kind: "edit-new", parentId: "root" } });
    expect(container.querySelector('[data-testid="edit-modal"]')).toBeTruthy();
    const ta = container.querySelector(
      '[data-testid="edit-modal-textarea"]',
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("");
  });

  it("updates the node on save in edit mode", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });
    const saveBtn = document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });
    expect(capturedState!.nodes.a.text).toBe("Task A");
    expect(capturedState!.modal).toBeNull();
  });

  it("creates a child on save in create mode (edit-new)", () => {
    setup({ modal: { kind: "edit-new", parentId: "root" } });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "New Task" } });
    });
    const saveBtn = document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });
    expect(capturedState!.modal).toBeNull();
    const child = Object.values(capturedState!.nodes).find(
      (n) => !n.isRoot && n.text === "New Task",
    );
    expect(child).toBeTruthy();
    expect(child!.parentId).toBe("root");
  });

  it("属性 section is collapsed by default", () => {
    const { container } = setup({ modal: { kind: "edit", nodeId: "a" } });
    const toggle = container.querySelector(
      '[data-testid="edit-modal-attr-toggle"]',
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeNull();
  });

  it("属性 section expands on toggle click", () => {
    const { container } = setup({ modal: { kind: "edit", nodeId: "a" } });
    const toggle = container.querySelector(
      '[data-testid="edit-modal-attr-toggle"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(toggle);
    });
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
  });

  it("DSL @priority:high in text sets priority on save", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "my task @priority:high" } });
    });
    const saveBtn = document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });
    expect(capturedState!.nodes.a.text).toBe("my task");
    expect(capturedState!.nodes.a.priority).toBe("high");
  });

  it("invalid @priority:urgent is preserved as text and doesn't break save", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "my task @priority:urgent" } });
    });
    const saveBtn = document.querySelector('[data-testid="edit-modal-save"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });
    expect(capturedState!.nodes.a.text).toContain("@priority:urgent");
  });

  it("キャンセル closes the modal", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });
    const cancelBtn = document.querySelector(
      '[data-testid="edit-modal-cancel"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(cancelBtn);
    });
    expect(capturedState!.modal).toBeNull();
  });

  it("削除 button only appears in edit mode", () => {
    const { container: editContainer } = setup({ modal: { kind: "edit", nodeId: "a" } });
    expect(editContainer.querySelector('[data-testid="edit-modal-delete"]')).toBeTruthy();

    const { container: createContainer } = setup({ modal: { kind: "edit-new", parentId: "root" } });
    expect(createContainer.querySelector('[data-testid="edit-modal-delete"]')).toBeNull();
  });

  it("削除 button deletes the node in edit mode", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });
    const deleteBtn = document.querySelector(
      '[data-testid="edit-modal-delete"]',
    ) as HTMLButtonElement;
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    act(() => {
      fireEvent.click(deleteBtn);
    });
    expect(capturedState!.nodes.a).toBeUndefined();
    expect(capturedState!.modal).toBeNull();
    window.confirm = originalConfirm;
  });

  it("Cmd+Enter in textarea saves in edit mode", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "Updated" } });
      fireEvent.keyDown(ta, { key: "Enter", metaKey: true });
    });
    expect(capturedState!.modal).toBeNull();
    expect(capturedState!.nodes.a.text).toBe("Updated");
  });

  it("Ctrl+Enter in textarea saves in edit-new mode", () => {
    setup({ modal: { kind: "edit-new", parentId: "root" } });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "New from shortcut" } });
      fireEvent.keyDown(ta, { key: "Enter", ctrlKey: true });
    });
    expect(capturedState!.modal).toBeNull();
    const child = Object.values(capturedState!.nodes).find((n) => n.text === "New from shortcut");
    expect(child).toBeTruthy();
  });

  it("属性 section collapses when the modal reopens for the same target", () => {
    setup({ modal: { kind: "edit", nodeId: "a" } });

    // Expand the 属性 section
    const toggle = document.querySelector(
      '[data-testid="edit-modal-attr-toggle"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(toggle);
    });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();

    // Close the modal
    act(() => {
      capturedDispatch!({ type: "OPEN_MODAL", modal: null });
    });

    // Reopen the modal for the same target node "a"
    act(() => {
      capturedDispatch!({ type: "OPEN_MODAL", modal: { kind: "edit", nodeId: "a" } });
    });

    // Verify 属性 section is collapsed (date input not visible)
    const reopenedDateInput = document.querySelector('input[type="date"]');
    expect(reopenedDateInput).toBeNull();
  });
});

const ROOT: MindNode = makeNode("root", null, { isRoot: true, text: "Root", children: [] });

function renderEditFor(node: MindNode) {
  const s: State = {
    ...createInitialState(),
    nodes: { [node.id]: node },
    modal: { kind: "edit", nodeId: node.id },
    currentBoardId: "b1",
  };
  return render(
    <MindProvider initialState={s}>
      <EditModal />
    </MindProvider>,
  );
}

describe("EditModal — status picker", () => {
  it("clicking a status button updates the picker and dispatch", () => {
    const node: MindNode = {
      id: "n1",
      boardId: "b",
      text: "t",
      parentId: null,
      isRoot: false,
      completed: false,
      collapsed: false,
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      status: "inbox",
      children: [],
      x: 0,
      y: 0,
    };
    renderEditFor(node);
    fireEvent.click(screen.getByTestId("edit-modal-attr-toggle"));
    const wipBtn = screen.getByTestId("status-wip") as HTMLButtonElement;
    act(() => {
      fireEvent.click(wipBtn);
    });
    expect(wipBtn.getAttribute("aria-pressed")).toBe("true");
    act(() => {
      fireEvent.click(screen.getByTestId("edit-modal-save"));
    });
  });

  it("inline @status:review in textarea mirrors into picker", () => {
    const node: MindNode = {
      id: "n1",
      boardId: "b",
      text: "t",
      parentId: null,
      isRoot: false,
      completed: false,
      collapsed: false,
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      status: "inbox",
      children: [],
      x: 0,
      y: 0,
    };
    renderEditFor(node);
    const ta = screen.getByTestId("edit-modal-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "t @status:review" } });
    });
    fireEvent.click(screen.getByTestId("edit-modal-attr-toggle"));
    const reviewBtn = screen.getByTestId("status-review") as HTMLButtonElement;
    expect(reviewBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("parentStatusSeed initializes status in edit-new modal", () => {
    const s: State = {
      ...createInitialState(),
      nodes: { root: ROOT },
      currentBoardId: "b1",
      modal: { kind: "edit-new", parentId: "root", parentStatusSeed: "wip" },
    };
    render(
      <MindProvider initialState={s}>
        <EditModal />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("edit-modal-attr-toggle"));
    const wipBtn = screen.getByTestId("status-wip") as HTMLButtonElement;
    expect(wipBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
