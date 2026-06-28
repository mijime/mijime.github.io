import type { Scenario } from "./types";

export function scenariosToDsl(scenarios: Scenario[]): string {
  return scenarios
    .map((s) => {
      const lines = s.events.map((e) => {
        const opsStr = e.ops.map((op) => `${op.asset}${op.op}${op.value}`).join(",");
        const groupCol = e.group ?? "";
        const endYear = e.endYear ?? "";
        const parts = [groupCol, e.name, String(e.startYear), endYear];
        if (opsStr) parts.push(opsStr);
        return parts.join(",");
      });
      return `# ${s.name}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}
