import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MindProvider } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import { BoardNameDialog } from "./BoardNameDialog";

function renderDialog() {
  const state: State = {
    ...createInitialState(),
    modal: { kind: "board-name", mode: "create" },
  };
  return render(
    <MindProvider initialState={state}>
      <BoardNameDialog />
    </MindProvider>,
  );
}

describe("BoardNameDialog", () => {
  it("does not truncate the value while the IME is composing", () => {
    renderDialog();
    const input = screen.getByLabelText("ボード名") as HTMLInputElement;
    const composing = "あ".repeat(60);

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: composing } });
    expect(input.value).toHaveLength(60);

    fireEvent.blur(input);
    expect(input.value).toHaveLength(50);
  });
});
