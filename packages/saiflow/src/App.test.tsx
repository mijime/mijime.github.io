import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders ProfileBar", () => {
    render(<App />);
    expect(screen.getByLabelText("現在年齢")).toBeInTheDocument();
  });

  it("renders editor tabs", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "DSL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GUI" })).toBeInTheDocument();
  });

  it("renders view toggle buttons", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "折れ線" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "収支" })).toBeInTheDocument();
  });
});
