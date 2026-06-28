import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders ProfileBar", () => {
    render(<App />);
    expect(screen.getByLabelText("年齢")).toBeInTheDocument();
  });

  it("renders editor tabs", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "DSL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GUI" })).toBeInTheDocument();
  });

  it("renders view toggle buttons", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "収支表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "資産推移" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "収支比較" })).toBeInTheDocument();
  });
});
