import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkLogModal } from "./WorkLogModal";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
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
    dueDate: "",
    status: "inbox",
    children: opts.children ?? [],
    x: 0,
    y: 0,
    estimate: null,
    workLogs: opts.workLogs ?? [],
    ...opts,
    startDate: opts.startDate ?? "",
  };
}

let captured: State | null = null;
function Capture() {
  captured = useMindStore().state;
  return null;
}

describe("WorkLogModal", () => {
  it("renders null when modal is not work-log kind", () => {
    const { container } = render(
      <MindProvider initialState={createInitialState() as State}>
        <WorkLogModal />
      </MindProvider>,
    );
    expect(container.querySelector('[data-testid="worklog-modal"]')).toBeNull();
  });

  it("renders modal with breadcrumb in header", () => {
    const state: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", workLogs: [] }),
      },
      modal: { kind: "work-log", nodeId: "a" },
    };
    const { container } = render(
      <MindProvider initialState={state}>
        <WorkLogModal />
      </MindProvider>,
    );
    expect(container.querySelector('[data-testid="worklog-modal"]')).toBeTruthy();
    expect(container.textContent).toContain("Root");
  });

  it("renders entries newest-first", () => {
    const state: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", {
          text: "A",
          workLogs: [
            { id: "wl1", timestamp: 1000, text: "Old" },
            { id: "wl2", timestamp: 2000, text: "New" },
          ],
        }),
      },
      modal: { kind: "work-log", nodeId: "a" },
    };
    const { container } = render(
      <MindProvider initialState={state}>
        <WorkLogModal />
      </MindProvider>,
    );
    const entries = container.querySelectorAll(
      '[data-testid^="worklog-modal-entry-"]',
    ) as NodeListOf<HTMLElement>;
    expect(entries).toHaveLength(2);
    expect(entries[0].dataset.testid).toBe("worklog-modal-entry-wl2");
    expect(entries[1].dataset.testid).toBe("worklog-modal-entry-wl1");
  });

  it("Enter in input dispatches ADD_WORK_LOG", () => {
    const state: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", workLogs: [] }),
      },
      modal: { kind: "work-log", nodeId: "a" },
    };
    render(
      <MindProvider initialState={state}>
        <Capture />
        <WorkLogModal />
      </MindProvider>,
    );
    const input = document.querySelector('[data-testid="worklog-modal-input"]')!;
    act(() => {
      fireEvent.change(input, { target: { value: "note" } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(captured!.nodes.a.workLogs).toHaveLength(1);
    expect(captured!.nodes.a.workLogs[0].text).toBe("note");
  });

  it("追加 button dispatches ADD_WORK_LOG", () => {
    const state: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", workLogs: [] }),
      },
      modal: { kind: "work-log", nodeId: "a" },
    };
    render(
      <MindProvider initialState={state}>
        <Capture />
        <WorkLogModal />
      </MindProvider>,
    );
    act(() => {
      fireEvent.change(document.querySelector('[data-testid="worklog-modal-input"]')!, {
        target: { value: "clicked" },
      });
    });
    act(() => {
      fireEvent.click(document.querySelector('[data-testid="worklog-modal-add"]')!);
    });
    expect(captured!.nodes.a.workLogs).toHaveLength(1);
  });

  it("追加 with empty text does nothing", () => {
    const state: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", workLogs: [] }),
      },
      modal: { kind: "work-log", nodeId: "a" },
    };
    render(
      <MindProvider initialState={state}>
        <Capture />
        <WorkLogModal />
      </MindProvider>,
    );
    act(() => {
      fireEvent.click(document.querySelector('[data-testid="worklog-modal-add"]')!);
    });
    expect(captured!.nodes.a.workLogs).toHaveLength(0);
  });

  it("trash button dispatches DELETE_WORK_LOG", () => {
    const state: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", {
          text: "A",
          workLogs: [{ id: "wl1", timestamp: 1000, text: "X" }],
        }),
      },
      modal: { kind: "work-log", nodeId: "a" },
    };
    render(
      <MindProvider initialState={state}>
        <Capture />
        <WorkLogModal />
      </MindProvider>,
    );
    act(() => {
      fireEvent.click(
        document.querySelector('[data-testid="worklog-modal-entry-wl1"]')!.querySelector("button")!,
      );
    });
    expect(captured!.nodes.a.workLogs).toHaveLength(0);
  });
});
