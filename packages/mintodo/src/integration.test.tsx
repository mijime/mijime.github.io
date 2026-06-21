import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { db } from "./db";

const flush = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe("board creation end-to-end", () => {
  afterEach(async () => {
    await db.delete();
  });

  it("creating a board switches view from EmptyState to Canvas", async () => {
    render(<App />);

    await act(async () => {
      await flush(100);
    });

    expect(screen.queryByText("最初のボードを作成")).toBeTruthy();
    expect(screen.queryByText("+ 新規ボード作成")).toBeTruthy();

    fireEvent.click(screen.getByText("+ 新規ボード作成"));

    expect(screen.queryByText("新しいボード")).toBeTruthy();

    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My Board" } });

    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });

    await act(async () => {
      await flush(300);
    });

    expect(screen.queryByText("新しいボード")).toBeNull();
    expect(screen.queryByText("最初のボードを作成")).toBeNull();
    expect(screen.queryByText("+ 新規ボード作成")).toBeNull();

    const boards = await db.boards.toArray();
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe("My Board");
  });
});
