import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { addHours, scheduleNodes } from "./schedule";

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

describe("addHours", () => {
	it("0 hours → copy", () => {
		const d = new Date(2026, 5, 25, 10, 0);
		expect(addHours(d, 0).getTime()).toBe(d.getTime());
	});
	it("within same day", () => {
		const r = addHours(new Date(2026, 5, 25, 9, 0), 4);
		expect(r.getHours()).toBe(13);
	});
	it("crosses midnight, stays on weekdays", () => {
		const r = addHours(new Date(2026, 5, 25, 15, 0), 4);
		expect(r.getDate()).toBe(26);
		expect(r.getHours()).toBe(11);
	});
	it("skips weekends (Fri 17:00 + 4h → Mon 13:00)", () => {
		const r = addHours(new Date(2026, 5, 26, 17, 0), 4);
		expect(r.getDay()).toBe(1);
		expect(r.getDate()).toBe(29);
		expect(r.getHours()).toBe(13);
	});
	it("skipWeekends: false treats Sat/Sun as normal", () => {
		const r = addHours(new Date(2026, 5, 27, 9, 0), 4, 8, false);
		expect(r.getDay()).toBe(6);
		expect(r.getHours()).toBe(13);
	});
	it("starting before 9am normalizes", () => {
		const r = addHours(new Date(2026, 5, 25, 7, 30), 2);
		expect(r.getHours()).toBe(11);
	});
});

describe("scheduleNodes", () => {
	it("empty → []", () => expect(scheduleNodes({}, new Date())).toEqual([]));
	it("single root 8h → one entry", () => {
		const start = new Date(2026, 5, 25, 9, 0);
		const nodes = { root: n("root", null, { isRoot: true, estimate: 8 }) };
		const r = scheduleNodes(nodes, start);
		expect(r).toHaveLength(1);
		expect(r[0].end.getTime()).toBe(new Date(2026, 5, 25, 17, 0).getTime());
	});
	it("sequential ordering", () => {
		const start = new Date(2026, 5, 25, 9, 0);
		const nodes = {
			root: n("root", null, { isRoot: true, estimate: 4, children: ["a"] }),
			a: n("a", "root", { estimate: 4 }),
		};
		const r = scheduleNodes(nodes, start);
		expect(r).toHaveLength(2);
		expect(r[1].start.getTime()).toBe(r[0].end.getTime());
	});
});
