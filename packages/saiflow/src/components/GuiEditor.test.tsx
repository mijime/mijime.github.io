import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuiEditor } from "./GuiEditor";
import { SaiflowProvider } from "../store";

describe("GuiEditor group name editing", () => {
  it("renders an event with a group name", () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "テストイベント",
                  group: "テストグループ",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    expect(screen.getByText("テストグループ")).toBeInTheDocument();
  });

  it("double-clicking group name enters edit mode", () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "OldGroup",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("OldGroup");
    fireEvent.doubleClick(groupName);
    const input = screen.getByDisplayValue("OldGroup") as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("editing group name and pressing Enter applies rename", async () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "OldGroup",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("OldGroup");
    fireEvent.doubleClick(groupName);

    const input = screen.getByDisplayValue("OldGroup") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "NewGroup" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("NewGroup")).toBeInTheDocument();
      expect(screen.queryByText("OldGroup")).not.toBeInTheDocument();
    });
  });

  it("clearing group name ungroups events", async () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "RemoveMe",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("RemoveMe");
    fireEvent.doubleClick(groupName);

    const input = screen.getByDisplayValue("RemoveMe") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByText("RemoveMe")).not.toBeInTheDocument();
    });
  });

  it("Escape cancels group rename", async () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "KeepMe",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("KeepMe");
    fireEvent.doubleClick(groupName);

    const input = screen.getByDisplayValue("KeepMe") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByText("KeepMe")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Changed")).not.toBeInTheDocument();
    });
  });
});
