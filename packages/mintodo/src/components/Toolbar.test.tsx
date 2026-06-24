import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar";
import { MindProvider } from "../hooks/use-mind-store";

describe("Toolbar header", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the 'mintodo' wordmark in the h1", () => {
    render(
      <MindProvider>
        <Toolbar />
      </MindProvider>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("mintodo");
  });
});
