import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DndContext, PointerSensor, useSensor, useSensors, type UniqueIdentifier, type DroppableContainer } from "@dnd-kit/core";
import { NodeCard } from "./NodeCard";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import type { State } from "../store";
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
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: {
      root: makeNode("root", null, { isRoot: true, children: ["a"] }),
      a: makeNode("a", "root", { x: 0, y: -340, children: ["a1"] }),
      a1: makeNode("a1", "a", { x: 0, y: -680 }),
    },
  };
}

let capturedState: State | null = null;

function Capture() {
  capturedState = useMindStore().state;
  return null;
}

function TestDndProvider({ children, nodeMap }: { children: React.ReactNode; nodeMap: Record<string, MindNode> }) {
  const { dispatch } = useMindStore();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  // Build collision rects from state node positions (viewport coords)
  const rectMap = new Map<string, { top: number; left: number; width: number; height: number }>();
  for (const n of Object.values(nodeMap)) {
    const w = 240;
    const h = 80;
    rectMap.set(n.id, { left: n.x, top: n.y, width: w, height: h });
  }
  const collisionDetection = (args: { active?: { id: UniqueIdentifier }; droppableContainers: DroppableContainer[]; pointerCoordinates: { x: number; y: number } | null }) => {
    if (!args.pointerCoordinates) return [];
    const activeId = args.active ? String(args.active.id) : null;
    const px = args.pointerCoordinates.x;
    const py = args.pointerCoordinates.y;
    return args.droppableContainers.filter((c) => {
      // Exclude the active (dragged) node so a non-active target at the same position is selected
      if (activeId && String(c.id) === activeId) return false;
      const r = rectMap.get(String(c.id));
      if (!r) return false;
      return px >= r.left && px <= r.left + r.width && py >= r.top && py <= r.top + r.height;
    }).map((c) => ({ id: c.id, data: { droppableContainer: c } }));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(event) => {
        dispatch({ id: String(event.active.id), type: "SET_DRAGGING" });
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (over) {
          dispatch({ id: String(active.id), newParentId: String(over.id), type: "REPARENT" });
        }
        dispatch({ id: null, type: "SET_DRAGGING" });
      }}
      onDragCancel={() => {
        dispatch({ id: null, type: "SET_DRAGGING" });
      }}
    >
      {children}
    </DndContext>
  );
}

function dragFromTo(source: HTMLElement, target: HTMLElement) {
  const srcRect = source.getBoundingClientRect();
  const tgtRect = target.getBoundingClientRect();
  const fromX = srcRect.left + srcRect.width / 2;
  const fromY = srcRect.top + srcRect.height / 2;
  const toX = tgtRect.left + tgtRect.width / 2;
  const toY = tgtRect.top + tgtRect.height / 2;
  const doc = source.ownerDocument;
  act(() => {
    fireEvent.pointerDown(source, {
      pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1,
      clientX: fromX, clientY: fromY,
    });
  });
  // Dispatch subsequent pointer events on document where dnd-kit's native listeners are attached
  act(() => {
    doc.dispatchEvent(new PointerEvent("pointermove", {
      pointerId: 1, pointerType: "mouse", isPrimary: true,
      clientX: fromX + 10, clientY: fromY + 10, buttons: 1, bubbles: true, cancelable: true,
    }));
  });
  act(() => {
    doc.dispatchEvent(new PointerEvent("pointermove", {
      pointerId: 1, pointerType: "mouse", isPrimary: true,
      clientX: toX, clientY: toY, buttons: 1, bubbles: true, cancelable: true,
    }));
  });
  act(() => {
    doc.dispatchEvent(new PointerEvent("pointerup", {
      pointerId: 1, pointerType: "mouse", isPrimary: true,
      clientX: toX, clientY: toY, button: 0, bubbles: true, cancelable: true,
    }));
  });
}

function setup(overrides?: Partial<State>) {
  const s = { ...makeState(), ...overrides };
  capturedState = null;
  return render(
    <MindProvider initialState={s}>
      <TestDndProvider nodeMap={s.nodes}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </TestDndProvider>
    </MindProvider>,
  );
}

describe("NodeCard multi-line text", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders multi-line text with whitespace-pre-wrap and max-w-[240px]", () => {
    const multiline = "line1\nline2 line3 line4 line5 line6 line7 line8 line9 line10";
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { x: 0, y: -340, text: multiline }),
      },
    });
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const textSpan = a.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(textSpan).toBeTruthy();
    expect(textSpan.className).toContain("whitespace-pre-wrap");
    expect(textSpan.className).toContain("break-words");
    expect(textSpan.className).toContain("max-w-[240px]");
    expect(textSpan.className).not.toContain("truncate");
    expect(textSpan.textContent).toBe(multiline);
  });
});

describe("NodeCard selection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clicking a non-root node selects it", () => {
    const { container } = setup();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    act(() => {
      fireEvent.click(childEl);
    });
    expect(capturedState!.selectedNodeId).toBe("a");
  });

  it("clicking a child button inside the card does not change selection", () => {
    const { container } = setup();
    const ellipsis = container.querySelector('[data-testid="ellipsis"]') as HTMLElement;
    act(() => {
      fireEvent.click(ellipsis);
    });
    expect(capturedState!.selectedNodeId).toBe("");
  });
});

describe("NodeCard drag-and-drop", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("non-root nodes have dnd-kit draggable attributes, root does not", () => {
    const { container } = setup();
    const rootEl = container.querySelector('[data-node-id="root"]') as HTMLElement;
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    expect(rootEl).toBeTruthy();
    expect(childEl).toBeTruthy();
    expect(childEl.getAttribute("role")).toBe("button");
    expect(rootEl.getAttribute("role")).not.toBe("button");
    expect(rootEl.getAttribute("tabindex")).toBeNull();
  });

  it("dragstart sets draggingNodeId in state", () => {
    const { container } = setup();
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    act(() => {
      fireEvent.pointerDown(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1,
        clientX: 0, clientY: 0,
      });
    });
    act(() => {
      fireEvent.pointerMove(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 10, clientY: 10, buttons: 1,
      });
    });
    expect(capturedState!.draggingNodeId).toBe("a");
    act(() => {
      fireEvent.pointerUp(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 10, clientY: 10, button: 0,
      });
    });
  });

  it("dragend clears draggingNodeId", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "root"),
        b: makeNode("b", "root"),
      },
    });
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    dragFromTo(a, b);
    expect(capturedState!.draggingNodeId).toBeNull();
  });

  it("drop on a valid target dispatches REPARENT", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"], x: -9999, y: -9999 }),
        a: makeNode("a", "root", { x: 0, y: 0 }),
        b: makeNode("b", "root", { x: 0, y: 0 }),
      },
    });
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    dragFromTo(a, b);
    expect(capturedState!.nodes.a.parentId).toBe("b");
    expect(capturedState!.nodes.b.children).toContain("a");
  });

  it("drop on self does nothing", () => {
    const { container } = setup();
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    dragFromTo(a, a);
    expect(capturedState!.nodes.a.parentId).toBe("root");
  });

  it("drop on a descendant does nothing", () => {
    const { container } = setup();
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const a1 = container.querySelector('[data-node-id="a1"]') as HTMLElement;
    dragFromTo(a, a1);
    expect(capturedState!.nodes.a.parentId).toBe("root");
  });

  it("reparent to root works", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { children: ["b"] }),
        b: makeNode("b", "a"),
      },
    });
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const root = container.querySelector('[data-node-id="root"]') as HTMLElement;
    dragFromTo(b, root);
    expect(capturedState!.nodes.b.parentId).toBe("root");
    expect(capturedState!.nodes.root.children).toContain("b");
  });

  it("dragenter adds ring-2 ring-sky-400 class to valid target", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"], x: -9999, y: -9999 }),
        a: makeNode("a", "root", { x: 0, y: 0 }),
        b: makeNode("b", "root", { x: 0, y: 0 }),
      },
    });
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const doc = a.ownerDocument;
    act(() => {
      fireEvent.pointerDown(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1,
        clientX: 120, clientY: 40,
      });
    });
    // Activate the drag
    act(() => {
      doc.dispatchEvent(new PointerEvent("pointermove", {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 130, clientY: 50, buttons: 1, bubbles: true, cancelable: true,
      }));
    });
    // Now the drag is active; check ring appears on target
    // (collision runs and finds b as over since a is excluded)
    expect(b.className).toContain("ring-2");
    expect(b.className).toContain("ring-sky-400");
    // End the drag
    act(() => {
      doc.dispatchEvent(new PointerEvent("pointerup", {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 120, clientY: 40, button: 0, bubbles: true, cancelable: true,
      }));
    });
  });

  it("ring class is not added to dragged node itself", () => {
    const { container } = setup();
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    act(() => {
      fireEvent.pointerDown(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1,
        clientX: 0, clientY: 0,
      });
    });
    act(() => {
      fireEvent.pointerMove(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 10, clientY: 10, buttons: 1,
      });
    });
    act(() => {
      fireEvent.pointerMove(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 20, clientY: 20, buttons: 1,
      });
    });
    expect(a.className).not.toContain("ring-2");
    act(() => {
      fireEvent.pointerUp(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 20, clientY: 20, button: 0,
      });
    });
  });

  it("ring class is not added to descendants of dragged node", () => {
    const { container } = setup();
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const a1 = container.querySelector('[data-node-id="a1"]') as HTMLElement;
    act(() => {
      fireEvent.pointerDown(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1,
        clientX: 0, clientY: 0,
      });
    });
    act(() => {
      fireEvent.pointerMove(a, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 10, clientY: 10, buttons: 1,
      });
    });
    act(() => {
      fireEvent.pointerMove(a1, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 0, clientY: -340, buttons: 1,
      });
    });
    expect(a1.className).not.toContain("ring-2");
    act(() => {
      fireEvent.pointerUp(a1, {
        pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: 0, clientY: -340, button: 0,
      });
    });
  });

  it("dragend clears all ring classes", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"], x: -9999, y: -9999 }),
        a: makeNode("a", "root"),
        b: makeNode("b", "root"),
      },
    });
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    dragFromTo(a, b);
    expect(b.className).not.toContain("ring-2");
    expect(b.className).not.toContain("ring-sky-400");
  });
});
