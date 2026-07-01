import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddEventModal } from "./AddEventModal";
import { SaiflowProvider } from "../store";
import type { Event } from "../types";

const renderModal = () => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <SaiflowProvider state={{ currentAge: 39 }}>
      <AddEventModal currentAge={39} onSave={onSave} onClose={onClose} />
    </SaiflowProvider>,
  );
  fireEvent.click(screen.getByText("子供"));
  return { onSave, onClose };
};

describe("ChildForm birth age input", () => {
  it('shows birth year input with "年数" mode by default', () => {
    renderModal();
    const inputs = screen.getAllByRole("spinbutton");
    const birthInput = inputs.find((el) => (el as HTMLInputElement).value === "2");
    expect(birthInput).toBeTruthy();
  });

  it('switches to "年齢" mode and shows child age (currentAge+2 by default)', () => {
    renderModal();
    fireEvent.change(screen.getByDisplayValue("年数"), { target: { value: "age" } });
    const inputs = screen.getAllByRole("spinbutton");
    const birthInput = inputs.find((el) => (el as HTMLInputElement).value === "41");
    expect(birthInput).toBeTruthy();
  });

  it("entering child age 5 sets birthAge = 5", () => {
    const { onSave } = renderModal();
    fireEvent.change(screen.getByDisplayValue("年数"), { target: { value: "age" } });

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "5" } });
    fireEvent.change(inputs[1]!, { target: { value: "5" } });

    const nameInput = screen.getByPlaceholderText("子1") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "太郎" } });

    fireEvent.click(screen.getByText("保存"));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [[events]] = onSave.mock.calls;
    expect(events.length).toBeGreaterThan(0);
    const livingEvent = events.find((e: Event) => e.name.startsWith("生活費"));
    expect(livingEvent.startAge).toBe(5);
  });

  it("offset mode: entering 3 years from now sets startAge to currentAge+3", () => {
    const { onSave } = renderModal();
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "3" } });
    fireEvent.change(inputs[1]!, { target: { value: "3" } });

    const nameInput = screen.getByPlaceholderText("子1") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "花子" } });

    fireEvent.click(screen.getByText("保存"));
    const [[events]] = onSave.mock.calls;
    const livingEvent = events.find((e: Event) => e.name.startsWith("生活費"));
    expect(livingEvent.startAge).toBe(42);
  });

  it("mode round-trip preserves birthAge data: offset→age→offset", () => {
    renderModal();
    const spinbuttons = screen.getAllByRole("spinbutton");
    expect((spinbuttons[0] as HTMLInputElement).value).toBe("2");

    fireEvent.change(screen.getByDisplayValue("年数"), { target: { value: "age" } });
    expect((spinbuttons[0] as HTMLInputElement).value).toBe("41");

    fireEvent.change(screen.getByDisplayValue("年齢"), { target: { value: "offset" } });
    expect((spinbuttons[0] as HTMLInputElement).value).toBe("2");
  });
});
