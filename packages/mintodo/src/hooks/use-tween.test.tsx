import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useTween } from "./use-tween";
import { MindProvider, useMindStore } from "./use-mind-store";
import type { Action, State } from "../store";
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

let capturedDispatch: ((action: Action) => void) | null = null;

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
      a: makeNode("a", "root", { x: 0, y: -340 }),
    },
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

function Probe(): ReactNode {
  const { dispatch } = useMindStore();
  capturedDispatch = dispatch;
  useTween();
  return null;
}

describe("useTween", () => {
  let animateSpy: ReturnType<typeof vi.fn> = vi.fn();

  beforeEach(() => {
    capturedDispatch = null;
    document.body.innerHTML = `
      <div id="node-dom-root" style="left: 0px; top: 0px"></div>
      <div id="node-dom-a" style="left: 0px; top: -340px"></div>
      <svg>
        <line id="edge-root-a" x1="0" y1="0" x2="0" y2="-340"></line>
      </svg>
    `;
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

  it("animates edge d attribute from old path to new path", () => {
    const s = makeState();
    s.nodes.a1 = makeNode("a1", "a", { x: 0, y: -680, children: [] });
    s.nodes.a = makeNode("a", "root", { x: 0, y: -340, children: ["a1"] });
    s.nodes.b = makeNode("b", "root", { x: 340, y: 0, children: [] });
    s.nodes.root.children = ["a", "b"];
    document.body.innerHTML = `
      <div id="node-dom-root" style="left: 0px; top: 0px"></div>
      <div id="node-dom-a" style="left: 0px; top: -340px"></div>
      <div id="node-dom-a1" style="left: 0px; top: -680px"></div>
      <div id="node-dom-b" style="left: 340px; top: 0px"></div>
      <svg>
        <path id="edge-root-a" d="M 0 0 C 0 0, 0 -340, 0 -340"></path>
        <path id="edge-a-a1" d="M 0 -340 C 0 -340, 0 -680, 0 -680"></path>
        <path id="edge-root-b" d="M 0 0 C 170 0, 170 0, 340 0"></path>
      </svg>
    `;
    render(
      <MindProvider initialState={s}>
        <Probe />
      </MindProvider>,
    );

    act(() => {
      capturedDispatch!({ id: "a", newParentId: "b", type: "REPARENT" });
    });

    const edgeEl = document.querySelector("#edge-a-a1");
    const edgeCallIndex = animateSpy.mock.instances.indexOf(edgeEl);
    expect(edgeCallIndex).not.toBe(-1);

    const kf0 = animateSpy.mock.calls[edgeCallIndex][0][0] as Record<string, string>;
    const kf1 = animateSpy.mock.calls[edgeCallIndex][0][1] as Record<string, string>;

    expect(kf0.d).toMatch(/^M /u);
    expect(kf0.d).toMatch(/0 -680$/u);
    expect(kf1.d).toMatch(/^M /u);
    expect(kf1.d).not.toMatch(/0 -680$/u);
  });
});
