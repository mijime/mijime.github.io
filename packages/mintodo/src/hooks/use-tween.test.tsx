import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useTween } from "./use-tween";
import { MindProvider } from "./use-mind-store";
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
    children: [],
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
    nodes: {
      root: makeNode("root", null, { isRoot: true, children: ["a"] }),
      a: makeNode("a", "root", { x: 0, y: -220 }),
    },
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

function Probe(): ReactNode {
  useTween();
  return null;
}

describe("useTween", () => {
  let animateSpy: ReturnType<typeof vi.fn> = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="node-dom-root" style="left: 0px; top: 0px"></div>
      <div id="node-dom-a" style="left: 0px; top: -220px"></div>
      <svg>
        <line id="edge-root-a" x1="0" y1="0" x2="0" y2="-220"></line>
      </svg>
    `;
    // Jsdom doesn't have Element.prototype.animate
    if (typeof Element.prototype.animate !== "function") {
      (Element.prototype as unknown as { animate: unknown }).animate = vi.fn();
    }
    animateSpy = vi
      .spyOn(
        Element.prototype as unknown as { animate: typeof Element.prototype.animate },
        "animate",
      )
      .mockImplementation((() => ({
        cancel: () => {},
      })) as unknown as typeof Element.prototype.animate) as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    animateSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("mounts without errors", () => {
    expect(() =>
      render(
        <MindProvider initialState={makeState()}>
          <Probe />
        </MindProvider>,
      ),
    ).not.toThrow();
  });

  it("does not animate on initial mount", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Probe />
      </MindProvider>,
    );
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it("skips animation while draggingId is set", () => {
    const s = makeState();
    s.draggingNodeId = "a";
    s.layoutVersion = 1;
    render(
      <MindProvider initialState={s}>
        <Probe />
      </MindProvider>,
    );
    expect(animateSpy).not.toHaveBeenCalled();
  });
});
