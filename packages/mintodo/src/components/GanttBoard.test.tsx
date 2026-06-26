import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GanttBoard } from "./GanttBoard";
import { MindProvider } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
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
		dueDate: opts.dueDate ?? "",
		status: "inbox",
		children: opts.children ?? [],
		x: 0,
		y: 0,
		estimate: opts.estimate ?? null,
		workLogs: [],
		...opts,
	};
}

function makeState(over: Partial<State> = {}): State {
	return {
		boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
		currentBoardId: "b1",
		draggingNodeId: null,
		drawerOpen: false,
		hideCompleted: false,
		layoutVersion: 0,
		modal: null,
		viewMode: "gantt",
		searchQuery: "",
		selectedNodeId: "",
		view: { pan: { x: 0, y: 0 }, zoom: 1 },
		nodes: {
			root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
			a: makeNode("a", "root", { text: "Task A", estimate: 4 }),
			b: makeNode("b", "root", { text: "Task B", estimate: 4 }),
		},
		...over,
	};
}

describe("GanttBoard", () => {
	it("renders one row per node (excluding root)", () => {
		render(
			<MindProvider initialState={makeState()}>
				<GanttBoard />
			</MindProvider>,
		);
		expect(screen.getByTestId("gantt-row-a")).toBeTruthy();
		expect(screen.getByTestId("gantt-row-b")).toBeTruthy();
		expect(screen.queryByTestId("gantt-row-root")).toBeNull();
	});

	it("does not crash with empty nodes", () => {
		render(
			<MindProvider initialState={{ ...createInitialState(), currentBoardId: null }}>
				<GanttBoard />
			</MindProvider>,
		);
		expect(screen.getByTestId("gantt-board")).toBeTruthy();
	});
});
