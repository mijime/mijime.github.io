import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createGame } from "../engine/setup";
import { createTask } from "../engine/tasks";
import type { CardInstance, GameState, TaskCard } from "../engine/types";
import { TaskCardView } from "./TaskCard";

function stateWithTask(lane: TaskCard["lane"]): { state: GameState; task: TaskCard } {
  const state = createGame(1);
  state.phase = "human";
  state.activePlayerIndex = 0;
  state.tasks = [];
  const human = state.players.find((player) => player.isHuman)!;
  const task = createTask(state, "search");
  task.lane = lane;
  task.ownerId = human.id;
  state.tasks.push(task);
  return { state, task };
}

function stateWithToken(): { state: GameState; task: TaskCard } {
  const { state, task } = stateWithTask("inbox");
  state.players.find((player) => player.isHuman)!.tokens = { mi: 1 };
  return { state, task };
}

describe("TaskCardView のLLMトークンUI", () => {
  it("LLMトークンを持つ手番中はBotマークのボタンを表示する", () => {
    const { state, task } = stateWithToken();
    render(<TaskCardView state={state} task={task} dispatch={vi.fn()} selectedCard={null} />);

    expect(screen.getByRole("button", { name: "LLMトークンを置く" })).toBeInTheDocument();
  });

  it("Botマークを押すとUSE_TOKENをdispatchする", () => {
    const { state, task } = stateWithToken();
    const dispatch = vi.fn();
    render(<TaskCardView state={state} task={task} dispatch={dispatch} selectedCard={null} />);

    fireEvent.click(screen.getByRole("button", { name: "LLMトークンを置く" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "USE_TOKEN", token: "mi", taskId: task.id });
  });

  it("LLMトークンを持っていなければマークを表示しない", () => {
    const { state, task } = stateWithToken();
    state.players.find((player) => player.isHuman)!.tokens = {};
    render(<TaskCardView state={state} task={task} dispatch={vi.fn()} selectedCard={null} />);

    expect(screen.queryByRole("button", { name: "LLMトークンを置く" })).toBeNull();
  });
});

describe("TaskCardView のカード配置プレビュー", () => {
  const designCard: CardInstance = { id: 999, type: "design", level: 4 };

  function articleFor(task: TaskCard): HTMLElement {
    return screen.getByText(task.title).closest("article")!;
  }

  it("同種カードを置けるタスクはハイライトし、クリックでPLAY_CARDをdispatchする", () => {
    const { state, task } = stateWithTask("inbox");
    const dispatch = vi.fn();
    const card: CardInstance = { id: 999, type: "design", level: 4 };
    render(<TaskCardView state={state} task={task} dispatch={dispatch} selectedCard={card} />);

    expect(articleFor(task).className).toContain("cursor-pointer");
    fireEvent.click(articleFor(task));
    expect(dispatch).toHaveBeenCalledWith({ type: "PLAY_CARD", cardId: card.id, taskId: task.id });
  });

  it("代用なしでは別種カードのタスクをハイライトせず、プレビューも表示しない", () => {
    const { state, task } = stateWithTask("wip");
    const dispatch = vi.fn();
    render(
      <TaskCardView state={state} task={task} dispatch={dispatch} selectedCard={designCard} />,
    );

    expect(articleFor(task).className).not.toContain("cursor-pointer");
    fireEvent.click(articleFor(task));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.queryByText(/→ lv/)).toBeNull();
  });
});
