import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createGame } from "../engine/setup";
import { createTask } from "../engine/tasks";
import type { GameState, TaskCard } from "../engine/types";
import { TaskCardView } from "./TaskCard";

function stateWithToken(): { state: GameState; task: TaskCard } {
  const state = createGame(1);
  state.phase = "human";
  state.activePlayerIndex = 0;
  state.tasks = [];
  const human = state.players.find((player) => player.isHuman)!;
  human.tokens = { mi: 1 };
  const task = createTask(state, "search");
  task.lane = "inbox";
  task.ownerId = human.id;
  state.tasks.push(task);
  return { state, task };
}

describe("TaskCardView のmiトークンUI", () => {
  it("miトークンを持つ手番中は「miを置く」ボタンを表示する", () => {
    const { state, task } = stateWithToken();
    render(<TaskCardView state={state} task={task} dispatch={vi.fn()} selectedCard={null} />);

    expect(screen.getByRole("button", { name: /miを置く/ })).toBeInTheDocument();
  });

  it("「miを置く」を押すとUSE_TOKENをdispatchする", () => {
    const { state, task } = stateWithToken();
    const dispatch = vi.fn();
    render(<TaskCardView state={state} task={task} dispatch={dispatch} selectedCard={null} />);

    fireEvent.click(screen.getByRole("button", { name: /miを置く/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: "USE_TOKEN", token: "mi", taskId: task.id });
  });

  it("miトークンを持っていなければボタンを表示しない", () => {
    const { state, task } = stateWithToken();
    state.players.find((player) => player.isHuman)!.tokens = {};
    render(<TaskCardView state={state} task={task} dispatch={vi.fn()} selectedCard={null} />);

    expect(screen.queryByRole("button", { name: /miを置く/ })).toBeNull();
  });

  it("配置モードではカードのクリックでトークンを置く", () => {
    const { state, task } = stateWithToken();
    const dispatch = vi.fn();
    const { container } = render(
      <TaskCardView state={state} task={task} dispatch={dispatch} selectedCard={null} tokenMode />,
    );

    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    fireEvent.click(article!);
    expect(dispatch).toHaveBeenCalledWith({ type: "USE_TOKEN", token: "mi", taskId: task.id });
  });
});
