import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodeInlineEditor } from "./NodeInlineEditor";
import type { MindNode } from "../types";

function makeNode(opts: Partial<MindNode> = {}): MindNode {
  return {
    id: "n1",
    boardId: "b1",
    text: "initial",
    parentId: "root",
    isRoot: false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: 0,
    y: 0,
    ...opts,
  };
}

describe("NodeInlineEditor", () => {
  it("renders textarea with node.text", () => {
    const { container } = render(
      <NodeInlineEditor
        node={makeNode({ text: "hello" })}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("hello");
  });

  it("calls onSave with the text on Enter (no shift)", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "new text" } });
    });
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter", shiftKey: false });
    });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ text: "new text" }));
  });

  it("does not call onSave on Shift+Enter (allows newline)", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onCancel on Escape", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={onCancel}
        onSave={() => {}}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.keyDown(ta, { key: "Escape" });
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it("extracts @priority:high and reflects on bar", () => {
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "task @priority:high" } });
    });
    // 展開して「高」ボタンが selected 状態か確認
    const toggle = container.querySelector("[data-attr-toggle]") as HTMLButtonElement;
    act(() => {
      fireEvent.click(toggle);
    });
    const highBtn = container.querySelector("[data-priority='high']") as HTMLButtonElement;
    expect(highBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onDelete when saving with empty text and no DSL attributes", () => {
    const onDelete = vi.fn();
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={onDelete}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "" } });
    });
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    expect(onDelete).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with the current bar values when no DSL attribute is typed", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "just text" } });
    });
    const toggle = container.querySelector("[data-attr-toggle]") as HTMLButtonElement;
    act(() => {
      fireEvent.click(toggle);
    });
    const highBtn = container.querySelector("[data-priority='high']") as HTMLButtonElement;
    act(() => {
      fireEvent.click(highBtn);
    });
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ text: "just text", priority: "high" }),
    );
  });
});
