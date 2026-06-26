import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { computeEstimates, effectiveEstimate } from "./estimate";

function n(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
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
		x: 0,
		y: 0,
		estimate: opts.estimate ?? null,
		workLogs: [],
		...opts,
	};
}

describe("effectiveEstimate", () => {
	it("leaf with null → 4", () =>
		expect(effectiveEstimate({ a: n("a", "root") }, "a")).toBe(4));
	it("leaf with 8 → 8", () =>
		expect(effectiveEstimate({ a: n("a", "root", { estimate: 8 }) }, "a")).toBe(8));
	it("parent null, two leaf children → 12", () => {
		const nodes = {
			root: n("root", null, { isRoot: true, children: ["a"] }),
			a: n("a", "root", { children: ["b", "c"] }),
			b: n("b", "a"),
			c: n("c", "a"),
		};
		expect(effectiveEstimate(nodes, "a")).toBe(12);
	});
	it("parent with 24h → 24", () => {
		const nodes = {
			root: n("root", null, { isRoot: true, children: ["a"] }),
			a: n("a", "root", { estimate: 24, children: ["b", "c"] }),
			b: n("b", "a"),
			c: n("c", "a"),
		};
		expect(effectiveEstimate(nodes, "a")).toBe(24);
	});
	it("missing id → 0", () => expect(effectiveEstimate({}, "missing")).toBe(0));
	it("zero estimate → treated as null (leaf returns 4)", () => {
		expect(effectiveEstimate({ a: n("a", "root", { estimate: 0 }) }, "a")).toBe(4);
	});
});

describe("computeEstimates", () => {
	it("returns values for every node", () => {
		const nodes = {
			root: n("root", null, { isRoot: true, children: ["a", "b"] }),
			a: n("a", "root", { children: ["c"] }),
			b: n("b", "root", { estimate: 10 }),
			c: n("c", "a"),
		};
		const map = computeEstimates(nodes);
		expect(map.get("root")).toBe(22);
		expect(map.get("a")).toBe(8);
		expect(map.get("b")).toBe(10);
		expect(map.get("c")).toBe(4);
	});
});
