import { describe, expect, it } from "vitest";
import { runCli, type CliOutput } from "./cli";

function capture() {
  let out = "";
  let err = "";
  const io: CliOutput = {
    out: (text) => {
      out += text;
    },
    err: (text) => {
      err += text;
    },
  };
  return { io, getOut: () => out, getErr: () => err };
}

describe("saiflow CLI", () => {
  it("prints help", () => {
    const { io, getOut } = capture();
    expect(runCli(["--help"], io)).toBe(0);
    expect(getOut()).toContain("使い方");
    expect(getOut()).toContain("--scenario");
  });

  it("outputs JSON for the first scenario", () => {
    const { io, getOut } = capture();
    expect(runCli(["--json", "--years", "3"], io)).toBe(0);
    const payload = JSON.parse(getOut()) as {
      scenario: { name: string };
      rows: unknown[];
      advice: unknown[];
    };
    expect(payload.scenario.name).toBe("現状維持");
    expect(payload.rows).toHaveLength(3);
    expect(Array.isArray(payload.advice)).toBe(true);
  });

  it("outputs all scenarios as a JSON array", () => {
    const { io, getOut } = capture();
    expect(runCli(["--all", "--json", "--years", "2"], io)).toBe(0);
    const payload = JSON.parse(getOut()) as unknown[];
    expect(payload).toHaveLength(2);
  });

  it("outputs CSV", () => {
    const { io, getOut } = capture();
    expect(runCli(["--csv", "--years", "2"], io)).toBe(0);
    expect(getOut()).toMatch(/^年齢,収入,支出,現金収支,総資産/);
  });

  it("outputs a single CSV header for all scenarios", () => {
    const { io, getOut } = capture();
    expect(runCli(["--all", "--csv", "--years", "2"], io)).toBe(0);
    const output = getOut();
    expect(output.split("\n").filter((line) => line.startsWith("シナリオ,"))).toHaveLength(1);
    expect(output).toContain("現状維持,35");
    expect(output).toContain("早期リタイア,35");
  });

  it("adds a Monte Carlo risk summary", () => {
    const { io, getOut } = capture();
    expect(runCli(["--json", "--years", "5", "--trials", "10", "--seed", "1"], io)).toBe(0);
    const payload = JSON.parse(getOut()) as {
      risk: { trials: number; p10: number; p50: number; p90: number };
    };
    expect(payload.risk.trials).toBe(10);
    expect(payload.risk.p10).toBeLessThanOrEqual(payload.risk.p50);
    expect(payload.risk.p50).toBeLessThanOrEqual(payload.risk.p90);
  });

  it("selects a scenario by name", () => {
    const { io, getOut } = capture();
    expect(runCli(["--scenario", "早期リタイア", "--no-advice", "--years", "3"], io)).toBe(0);
    expect(getOut()).toContain("早期リタイア");
    expect(getOut()).not.toContain("気づき:");
  });

  it("applies age and years", () => {
    const { io, getOut } = capture();
    expect(runCli(["--age", "40", "--years", "3", "--no-advice"], io)).toBe(0);
    expect(getOut()).toContain("40〜42歳 / 3年");
  });

  it("returns an error for an unknown scenario", () => {
    const { io, getErr } = capture();
    expect(runCli(["--scenario", "存在しない"], io)).toBe(1);
    expect(getErr()).toContain("見つかりません");
  });
});
