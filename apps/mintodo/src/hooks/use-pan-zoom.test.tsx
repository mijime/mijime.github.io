import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePanZoom } from "./use-pan-zoom";
import { MindProvider, useMindStore } from "./use-mind-store";
import { useRef } from "react";

function TestComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state } = useMindStore();
  usePanZoom({ containerRef });

  return (
    <div ref={containerRef} style={{ width: "800px", height: "600px" }}>
      Pan: {state.view.pan.x}, {state.view.pan.y} | Zoom: {state.view.zoom}
    </div>
  );
}

describe("usePanZoom", () => {
  it("plain wheel changes pan.y", async () => {
    const { container } = render(
      <MindProvider>
        <TestComponent />
      </MindProvider>,
    );

    const el = container.querySelector("div") as HTMLDivElement;
    const initialView = "Pan: 0, 0";
    expect(el.textContent).toContain(initialView);

    await act(() => {
      const event = new WheelEvent("wheel", {
        deltaY: 100,
        deltaX: 0,
        bubbles: true,
      });
      el.dispatchEvent(event);
    });

    expect(el.textContent).toContain("Pan: 0, -100");
  });

  it("Shift+wheel changes pan.x only", async () => {
    const { container } = render(
      <MindProvider>
        <TestComponent />
      </MindProvider>,
    );

    const el = container.querySelector("div") as HTMLDivElement;

    await act(() => {
      const event = new WheelEvent("wheel", {
        deltaY: 100,
        deltaX: 50,
        shiftKey: true,
        bubbles: true,
      });
      el.dispatchEvent(event);
    });

    expect(el.textContent).toContain("Pan: -150, 0");
  });

  it("Ctrl+wheel changes zoom (clamped [0.2, 3])", async () => {
    const { container } = render(
      <MindProvider>
        <TestComponent />
      </MindProvider>,
    );

    const el = container.querySelector("div") as HTMLDivElement;

    await act(() => {
      const event = new WheelEvent("wheel", {
        deltaY: -100,
        deltaX: 0,
        ctrlKey: true,
        bubbles: true,
        clientX: 400,
        clientY: 300,
      });
      el.dispatchEvent(event);
    });

    expect(el.textContent).toMatch(/Zoom: [1-9]/u);
  });

  it("Cmd+wheel on Mac changes zoom", async () => {
    const { container } = render(
      <MindProvider>
        <TestComponent />
      </MindProvider>,
    );

    const el = container.querySelector("div") as HTMLDivElement;

    await act(() => {
      const event = new WheelEvent("wheel", {
        deltaY: -50,
        deltaX: 0,
        metaKey: true,
        bubbles: true,
        clientX: 400,
        clientY: 300,
      });
      el.dispatchEvent(event);
    });

    expect(el.textContent).toMatch(/Zoom: [1-9]/u);
  });

  it("zoom is clamped at minimum 0.2", async () => {
    const { container } = render(
      <MindProvider>
        <TestComponent />
      </MindProvider>,
    );

    const el = container.querySelector("div") as HTMLDivElement;

    await act(() => {
      for (let i = 0; i < 10; i++) {
        const event = new WheelEvent("wheel", {
          deltaY: 1000,
          deltaX: 0,
          ctrlKey: true,
          bubbles: true,
          clientX: 400,
          clientY: 300,
        });
        el.dispatchEvent(event);
      }
    });

    expect(el.textContent).toContain("Zoom: 0.2");
  });

  it("zoom is clamped at maximum 3", async () => {
    const { container } = render(
      <MindProvider>
        <TestComponent />
      </MindProvider>,
    );

    const el = container.querySelector("div") as HTMLDivElement;

    await act(() => {
      for (let i = 0; i < 10; i++) {
        const event = new WheelEvent("wheel", {
          deltaY: -1000,
          deltaX: 0,
          ctrlKey: true,
          bubbles: true,
          clientX: 400,
          clientY: 300,
        });
        el.dispatchEvent(event);
      }
    });

    expect(el.textContent).toContain("Zoom: 3");
  });
});
