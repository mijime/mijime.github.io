import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRef } from "react";
import { ConnectionLines } from "./ConnectionLines";
import { MindProvider } from "../hooks/use-mind-store";
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
    nodes: {},
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

function setup(overrides?: Partial<State>) {
  const s = { ...makeState(), ...overrides };
  const containerRef = createRef<HTMLDivElement>();
  return render(
    <MindProvider initialState={s}>
      <div ref={containerRef} />
      <ConnectionLines containerRef={containerRef} />
    </MindProvider>,
  );
}

describe("ConnectionLines", () => {
  it("renders a curved path for each parent-child connection", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "root", { x: 300, y: 0 }),
        b: makeNode("b", "root", { x: -300, y: 0 }),
      },
    });
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(2);
    for (const path of paths) {
      expect(path.getAttribute("d")).toMatch(
        /^M\s*[\d.-]+\s*[\d.-]+\s*C\s*[\d.-]+\s*[\d.-]+,\s*[\d.-]+\s*[\d.-]+,\s*[\d.-]+\s*[\d.-]+\s*$/u,
      );
    }
  });

  it("path's control points spread horizontally from the endpoints", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { x: 300, y: 0 }),
      },
    });
    const path = container.querySelector("path")!;
    const d = path.getAttribute("d");
    expect(d).toBe("M 0 0 C 150 0, 150 0, 300 0");
  });

  it("uses a minimum horizontal spread so the curve is visible even for vertical connections", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { x: 0, y: -340 }),
      },
    });
    const path = container.querySelector("path")!;
    const d = path.getAttribute("d");
    // Without minimum spread this would be "M 0 0 C 0 0, 0 -340, 0 -340"
    expect(d).toBe("M 0 0 C 60 0, -60 -340, 0 -340");
  });

  it("path is symmetric for left-going connections", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { x: -300, y: 0 }),
      },
    });
    const path = container.querySelector("path")!;
    const d = path.getAttribute("d");
    expect(d).toBe("M 0 0 C -150 0, -150 0, -300 0");
  });

  it("does not render connection for child of collapsed parent", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { collapsed: true, children: ["a1"] }),
        a1: makeNode("a1", "a", { x: 300, y: 0 }),
      },
    });
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(1);
    // Only the root → a connection exists, not a → a1
    expect(paths[0].id).toBe("edge-root-a");
  });

  it("does not render connection for completed node when hideCompleted is true", () => {
    const { container } = setup({
      hideCompleted: true,
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { completed: true }),
      },
    });
    expect(container.querySelectorAll("path").length).toBe(0);
  });

  it("path uses active color for incomplete, inactive (dashed) for completed", () => {
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "root", { completed: false }),
        b: makeNode("b", "root", { completed: true }),
      },
    });
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(2);
    const [activePath, inactivePath] = paths;
    expect(activePath.getAttribute("stroke")).toBe("var(--terra)");
    expect(activePath.getAttribute("stroke-dasharray")).toBeNull();
    expect(inactivePath.getAttribute("stroke")).toBe("var(--grid)");
    expect(inactivePath.getAttribute("stroke-dasharray")).toBe("5,5");
  });
});
