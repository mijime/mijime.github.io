import { describe, expect, it } from "bun:test";
import { createInitialNodes } from "./store";

describe("createInitialNodes", () => {
  it("includes root node", () => {
    const nodes = createInitialNodes();
    expect(nodes.root).toBeDefined();
    expect(nodes.root.isRoot).toBe(true);
    expect(nodes.root.parentId).toBeNull();
    expect(nodes.root.children.length).toBeGreaterThan(0);
  });

  it("all non-root nodes have valid parentId", () => {
    const nodes = createInitialNodes();
    for (const [id, node] of Object.entries(nodes)) {
      if (node.isRoot) continue;
      expect(node.parentId).toBeTruthy();
      expect(nodes[node.parentId!]).toBeDefined();
    }
  });

  it("all children references are valid", () => {
    const nodes = createInitialNodes();
    for (const node of Object.values(nodes)) {
      for (const childId of node.children) {
        expect(nodes[childId]).toBeDefined();
      }
    }
  });

  it("root children are valid", () => {
    const nodes = createInitialNodes();
    for (const childId of nodes.root.children) {
      expect(nodes[childId].parentId).toBe("root");
    }
  });
});
