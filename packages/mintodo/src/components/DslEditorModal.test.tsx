import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DslEditorModal } from "./DslEditorModal";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import type { Board, MindNode } from "../types";
import { createInitialState, type State } from "../store";

vi.mock("../hooks/use-board-actions");

const SEED_BOARD: Board = { id: "b1", name: "Test Board", createdAt: 0, updatedAt: 0 };

const ROOT: MindNode = {
  id: "root",
  boardId: "b1",
  text: "Test Board",
  parentId: null,
  isRoot: true,
  completed: false,
  collapsed: false,
  priority: "medium",
  categoryColor: "slate",
  dueDate: "",
  status: "inbox",
  children: ["n0"],
  x: 0,
  y: 0,
};
const CHILD: MindNode = {
  id: "n0",
  boardId: "b1",
  text: "牛乳",
  parentId: "root",
  isRoot: false,
  completed: false,
  collapsed: false,
  priority: "high",
  categoryColor: "slate",
  dueDate: "",
  status: "inbox",
  children: [],
  x: 0,
  y: 0,
};

function makeState(): State {
  const s = createInitialState();
  s.boards = [SEED_BOARD];
  s.currentBoardId = "b1";
  s.nodes = { root: ROOT, n0: CHILD };
  s.modal = { kind: "dsl-editor" };
  return s;
}

function makeEmptyState(): State {
  const s = createInitialState();
  s.boards = [{ id: "b1", name: "Empty Board", createdAt: 0, updatedAt: 0 }];
  s.currentBoardId = "b1";
  s.nodes = {};
  s.modal = { kind: "dsl-editor" };
  return s;
}

function renderModal() {
  return render(
    <MindProvider initialState={makeState()}>
      <DslEditorModal />
    </MindProvider>,
  );
}

function StateInspector({ onRender }: { onRender: (state: State) => void }) {
  const { state } = useMindStore();
  onRender(state);
  return null;
}

describe("DslEditorModal", () => {
  const mockedActions = vi.mocked(useBoardActions);

  beforeEach(() => {
    mockedActions.mockReturnValue({
      createBoard: vi.fn(),
      deleteBoard: vi.fn(),
      renameBoard: vi.fn().mockResolvedValue(undefined),
      switchBoard: vi.fn(),
      refreshBoards: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the modal with serialized DSL in the textarea", () => {
    renderModal();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("mindmap\n  * Test Board\n    * 牛乳 @priority:high\n");
  });

  it("SAVE dispatches SET_NODES and renames the board", async () => {
    const renameBoard = vi.fn().mockResolvedValue(undefined);
    mockedActions.mockReturnValue({
      createBoard: vi.fn(),
      deleteBoard: vi.fn(),
      renameBoard,
      switchBoard: vi.fn(),
      refreshBoards: vi.fn(),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    let captured: State | null = null;
    render(
      <MindProvider initialState={makeState()}>
        <StateInspector
          onRender={(s) => {
            captured = s;
          }}
        />
        <DslEditorModal />
      </MindProvider>,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "mindmap\n  * 新しいボード\n    * タスクA @done\n    * タスクB\n" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("SAVE"));
    });

    await waitFor(() => {
      expect(renameBoard).toHaveBeenCalledWith("b1", "新しいボード");
      expect(captured!.nodes["n0"]?.text).toBe("タスクA");
      expect(captured!.nodes["n0"]?.completed).toBe(true);
    });
    expect(renameBoard).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and does not dispatch on parse failure", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderModal();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Root\n\tchild\n" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("SAVE"));
    });

    expect(screen.getByText(/DSL の形式が不正/u)).toBeTruthy();
    expect(mockedActions().renameBoard).not.toHaveBeenCalled();
  });

  it("Cmd+Enter triggers SAVE", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderModal();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "mindmap\n  * NewName\n    * child\n" } });
    });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
    });

    await waitFor(() => {
      expect(mockedActions().renameBoard).toHaveBeenCalledWith("b1", "NewName");
    });
  });

  it("Esc closes the modal", async () => {
    renderModal();
    expect(screen.getByText("DSL 編集")).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(screen.queryByText("DSL 編集")).toBeNull();
  });

  it("background click closes the modal", async () => {
    renderModal();
    const overlay = screen.getByText("DSL 編集").closest(".fixed") as HTMLElement;
    await act(async () => {
      fireEvent.click(overlay);
    });
    expect(screen.queryByText("DSL 編集")).toBeNull();
  });

  it("× button closes the modal", async () => {
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("閉じる"));
    });
    expect(screen.queryByText("DSL 編集")).toBeNull();
  });

  it("キャンセル button closes the modal", async () => {
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByText("キャンセル"));
    });
    expect(screen.queryByText("DSL 編集")).toBeNull();
  });

  it("Ctrl+Enter triggers SAVE", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderModal();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "mindmap\n  * NewName\n    * child\n" } });
    });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    });

    await waitFor(() => {
      expect(mockedActions().renameBoard).toHaveBeenCalledWith("b1", "NewName");
    });
  });

  it("Empty board opens without error", () => {
    render(
      <MindProvider initialState={makeEmptyState()}>
        <DslEditorModal />
      </MindProvider>,
    );

    expect(screen.getByText("DSL 編集")).toBeTruthy();
  });
});
