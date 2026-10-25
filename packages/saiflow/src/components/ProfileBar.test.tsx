import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileBar } from "./ProfileBar";
import { SaiflowProvider } from "../store";

describe("ProfileBar", () => {
  it("renders currentAge input", () => {
    render(
      <SaiflowProvider>
        <ProfileBar />
      </SaiflowProvider>,
    );
    expect(screen.getByLabelText("年齢")).toBeInTheDocument();
  });

  it("renders simulationYears input", () => {
    render(
      <SaiflowProvider>
        <ProfileBar />
      </SaiflowProvider>,
    );
    expect(screen.getByLabelText(/期間/)).toBeInTheDocument();
  });

  it("shows current values from state", () => {
    render(
      <SaiflowProvider state={{ currentAge: 40, simulationYears: 60 }}>
        <ProfileBar />
      </SaiflowProvider>,
    );
    const ageInput = screen.getByLabelText("年齢") as HTMLInputElement;
    expect(ageInput.value).toBe("40");
    const yearsInput = screen.getByLabelText(/期間/) as HTMLInputElement;
    expect(yearsInput.value).toBe("60");
  });
});

describe("ProfileBar input drafts", () => {
  it("allows clearing the field and restores the value on blur", () => {
    render(
      <SaiflowProvider state={{ currentAge: 35 }}>
        <ProfileBar />
      </SaiflowProvider>,
    );
    const input = screen.getByLabelText("年齢") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.blur(input);
    expect(input.value).toBe("35");
  });

  it("commits a valid age on blur", () => {
    render(
      <SaiflowProvider state={{ currentAge: 35 }}>
        <ProfileBar />
      </SaiflowProvider>,
    );
    const input = screen.getByLabelText("年齢") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);
    expect(input.value).toBe("42");
  });
});
