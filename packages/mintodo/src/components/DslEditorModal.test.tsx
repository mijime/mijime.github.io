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
  children: ["n0"],
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
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
  children: [],
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
};

function makeState(): State {
  const s = createInitialState();
  s.boards = [SEED_BOARD];
  s.currentBoardId = "b1";
  s.nodes = { root: ROOT, n0: CHILD };
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
    expect(textarea.value).toBe("Test Board\n  牛乳 @priority:high\n");
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

    render(
      <MindProvider initialState={makeState()}>
        <ModalWithDispatch />
      </MindProvider>,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "新しいボード\n  タスクA @done\n  タスクB\n" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("SAVE"));
    });

    await waitFor(() => {
      expect(renameBoard).toHaveBeenCalledWith("b1", "新しいボード");
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
      fireEvent.change(textarea, { target: { value: "NewName\n  child\n" } });
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
});

// Helper that gives the test access to dispatch for state inspection.
function ModalWithDispatch() {
  const { state } = useMindStore();
  return state.modal?.kind === "dsl-editor" ? <DslEditorModal /> : null;
}
