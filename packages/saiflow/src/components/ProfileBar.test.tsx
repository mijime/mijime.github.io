import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByLabelText("期間年")).toBeInTheDocument();
  });

  it("shows current values from state", () => {
    render(
      <SaiflowProvider state={{ currentAge: 40, simulationYears: 60 }}>
        <ProfileBar />
      </SaiflowProvider>,
    );
    const ageInput = screen.getByLabelText("年齢") as HTMLInputElement;
    expect(ageInput.value).toBe("40");
    const yearsInput = screen.getByLabelText("期間年") as HTMLInputElement;
    expect(yearsInput.value).toBe("60");
  });
});
