import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddEventModal } from "./AddEventModal";
import { SaiflowProvider } from "../store";

describe("ChildForm birth year input", () => {
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

  it('shows birth year input with "年数" mode by default', () => {
    renderModal();
    const inputs = screen.getAllByRole("spinbutton");
    const birthInput = inputs.find((el) => (el as HTMLInputElement).value === "2");
    expect(birthInput).toBeTruthy();
  });

  it('switches to "年齢" mode and shows child age (0 by default)', () => {
    renderModal();
    const selects = screen.getAllByRole("combobox");
    const modeSelect = selects.find(
      (el) =>
        el.querySelector("option")?.textContent === "年数" &&
        el.querySelectorAll("option").length >= 2,
    );
    expect(modeSelect).toBeTruthy();
    fireEvent.change(modeSelect!, { target: { value: "age" } });
    const inputs = screen.getAllByRole("spinbutton");
    const birthInput = inputs.find((el) => (el as HTMLInputElement).value === "0");
    expect(birthInput).toBeTruthy();
  });

  it("entering child age 5 sets birthYear = -5", () => {
    const { onSave } = renderModal();
    const selects = screen.getAllByRole("combobox");
    const modeSelect = selects.find(
      (el) =>
        el.querySelector("option")?.textContent === "年数" &&
        el.querySelectorAll("option").length >= 2,
    );
    fireEvent.change(modeSelect!, { target: { value: "age" } });

    const inputs = screen.getAllByRole("spinbutton");
    // First spinbutton is birth year, second is living monthly
    fireEvent.change(inputs[0]!, { target: { value: "5" } });
    fireEvent.change(inputs[1]!, { target: { value: "5" } });

    const nameInput = screen.getByPlaceholderText("子1") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "太郎" } });

    fireEvent.click(screen.getByText("保存"));
    expect(onSave).toHaveBeenCalledTimes(1);
    const events = onSave.mock.calls[0][0];
    expect(events.length).toBeGreaterThan(0);
    const livingEvent = events.find((e: any) => e.name.startsWith("生活費"));
    expect(livingEvent.startYear).toBe(0);
  });

  it('offset mode still works: birthYear=3 sets startYear correctly', () => {
    const { onSave } = renderModal();
    const inputs = screen.getAllByRole("spinbutton");
    // First spinbutton is birth year, second is living monthly
    fireEvent.change(inputs[0]!, { target: { value: "3" } });
    fireEvent.change(inputs[1]!, { target: { value: "3" } });

    const nameInput = screen.getByPlaceholderText("子1") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "花子" } });

    fireEvent.click(screen.getByText("保存"));
    const events = onSave.mock.calls[0][0];
    const livingEvent = events.find((e: any) => e.name.startsWith("生活費"));
    expect(livingEvent.startYear).toBe(3);
  });
});
