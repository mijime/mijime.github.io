import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createPlan } from "../storage";
import { PlanTabs } from "./plan-tabs";

function makePlans(names: string[]) {
  return names.map((name, i) => ({ ...createPlan(name), id: `p${i}` }));
}

describe("PlanTabs", () => {
  it("renders plan names, PLAN label and NEW button", () => {
    const plans = makePlans(["和室案", "洋室案"]);
    const html = renderToString(
      <PlanTabs
        plans={plans}
        activePlanId="p0"
        onSelect={() => {}}
        onAdd={() => {}}
        onRename={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(html).toContain("PLAN");
    expect(html).toContain("和室案");
    expect(html).toContain("洋室案");
    expect(html).toContain("NEW");
  });

  it("shows the remove button for the active plan only when multiple plans exist", () => {
    const single = renderToString(
      <PlanTabs
        plans={makePlans(["only"])}
        activePlanId="p0"
        onSelect={() => {}}
        onAdd={() => {}}
        onRename={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(single).not.toContain("×");

    const multiple = renderToString(
      <PlanTabs
        plans={makePlans(["a", "b"])}
        activePlanId="p0"
        onSelect={() => {}}
        onAdd={() => {}}
        onRename={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(multiple).toContain("×");
  });
});
