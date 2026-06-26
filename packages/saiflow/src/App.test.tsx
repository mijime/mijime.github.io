import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders ProfileBar", () => {
    render(<App />);
    expect(screen.getByLabelText("現在年齢")).toBeInTheDocument();
  });
});
