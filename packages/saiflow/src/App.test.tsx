import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders ProfileBar", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByLabelText("年齢")).toBeInTheDocument();
    });
  });

  it("renders editor tabs", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "DSL" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "GUI" })).toBeInTheDocument();
  });

  it("renders view toggle buttons", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "収支表" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "資産推移" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "収支比較" })).toBeInTheDocument();
  });
});
