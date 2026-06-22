import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NodeCard } from "./NodeCard";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import type { State } from "../store";
import type { MindNode } from "../types";

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

function setup(overrides?: Partial<State>) {
  const s = { ...makeState(), ...overrides };
  capturedState = null;
  return render(
    <MindProvider initialState={s}>
      <Capture />
      {Object.values(s.nodes).map((n: MindNode) => (
        <NodeCard key={n.id} node={n} />
      ))}
    </MindProvider>,
  );
}

describe("NodeCard drag-and-drop", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("non-root nodes are draggable, root is not", () => {
    const { container } = setup();
    const rootEl = container.querySelector('[data-node-id="root"]') as HTMLElement;
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    expect(rootEl.draggable).toBe(false);
    expect(childEl.draggable).toBe(true);
  });

  it("dragstart sets draggingNodeId in state", () => {
    const { container } = setup();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    expect(capturedState!.draggingNodeId).toBe("a");
  });

  it("dragend clears draggingNodeId", () => {
    const { container } = setup();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.dragEnd(childEl, { dataTransfer: dt });
    });
    expect(capturedState!.draggingNodeId).toBeNull();
  });

  it("drop on a valid target dispatches REPARENT", () => {
    const s: State = {
      ...makeState(),
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "root"),
        b: makeNode("b", "root"),
      },
    };
    const { container } = render(
      <MindProvider initialState={s}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </MindProvider>,
    );
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const targetEl = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.drop(targetEl, { dataTransfer: dt });
    });
    expect(capturedState!.nodes.a.parentId).toBe("b");
    expect(capturedState!.nodes.b.children).toContain("a");
  });

  it("drop on self does nothing", () => {
    const { container } = setup();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.drop(childEl, { dataTransfer: dt });
    });
    expect(capturedState!.nodes.a.parentId).toBe("root");
  });

  it("drop on a descendant does nothing", () => {
    const { container } = setup();
    const parentEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const childEl = container.querySelector('[data-node-id="a1"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(parentEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.drop(childEl, { dataTransfer: dt });
    });
    expect(capturedState!.nodes.a.parentId).toBe("root");
  });

  it("reparent to root works", () => {
    const s: State = {
      ...makeState(),
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { children: ["b"] }),
        b: makeNode("b", "a"),
      },
    };
    const { container } = render(
      <MindProvider initialState={s}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </MindProvider>,
    );
    const childEl = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const rootEl = container.querySelector('[data-node-id="root"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.drop(rootEl, { dataTransfer: dt });
    });
    expect(capturedState!.nodes.b.parentId).toBe("root");
    expect(capturedState!.nodes.root.children).toContain("b");
  });

  it("dragenter adds highlight class, dragleave removes it", () => {
    const s: State = {
      ...makeState(),
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "root"),
        b: makeNode("b", "root"),
      },
    };
    const { container } = render(
      <MindProvider initialState={s}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </MindProvider>,
    );
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const targetEl = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.dragEnter(targetEl, { dataTransfer: dt });
    });
    expect(targetEl.classList.contains("ring-2")).toBe(true);
    expect(targetEl.classList.contains("ring-sky-400")).toBe(true);
    act(() => {
      fireEvent.dragLeave(targetEl, { dataTransfer: dt });
    });
    expect(targetEl.classList.contains("ring-2")).toBe(false);
    expect(targetEl.classList.contains("ring-sky-400")).toBe(false);
  });

  it("dragend clears all highlight classes", () => {
    const s: State = {
      ...makeState(),
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b", "c"] }),
        a: makeNode("a", "root"),
        b: makeNode("b", "root"),
        c: makeNode("c", "root"),
      },
    };
    const { container } = render(
      <MindProvider initialState={s}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </MindProvider>,
    );
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const target1 = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const target2 = container.querySelector('[data-node-id="c"]') as HTMLElement;
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(childEl, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.dragEnter(target1, { dataTransfer: dt });
    });
    act(() => {
      fireEvent.dragEnter(target2, { dataTransfer: dt });
    });
    // Both targets should have the highlight
    expect(target1.classList.contains("ring-2")).toBe(true);
    expect(target2.classList.contains("ring-2")).toBe(true);
    act(() => {
      fireEvent.dragEnd(childEl, { dataTransfer: dt });
    });
    expect(target1.classList.contains("ring-2")).toBe(false);
    expect(target2.classList.contains("ring-2")).toBe(false);
  });
});
