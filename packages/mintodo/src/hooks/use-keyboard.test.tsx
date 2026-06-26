import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { db } from "../db";

const flush = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe("useKeyboard — delete without confirm", () => {
  it("pressing Delete on selected non-root dispatches DELETE_NODE without confirm", async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
    render(<App />);
    await act(async () => {
      await flush(100);
    });
    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });
    const addBtn = document.querySelector('[data-testid="add-child-root"]')!;
    await act(() => {
      fireEvent.click(addBtn);
    });
    const ta = document.querySelector('[data-testid="edit-modal-textarea"]')!;
    await act(() => {
      fireEvent.change(ta, { target: { value: "delete me" } });
    });
    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="edit-modal-save"]')!);
    });
    await act(async () => {
      await flush(500);
    });
    const childNode = document.querySelector(
      '[data-node-id]:not([data-node-id="root"])',
    ) as HTMLElement;
    expect(childNode).toBeTruthy();
    const confirmSpy = vi.spyOn(window, "confirm");
    await act(() => {
      fireEvent.keyDown(window, { key: "Delete" });
    });
    await act(async () => {
      await flush(50);
    });
    expect(document.querySelectorAll('[data-node-id]:not([data-node-id="root"])').length).toBe(0);
    expect(confirmSpy).not.toHaveBeenCalled();
    await db.delete();
  });
});
