import { describe, expect, it } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("既定値とシード範囲を解決する", () => {
    const options = parseArgs(["--runs", "50", "--from", "10"]);
    expect(options.from).toBe(10);
    expect(options.to).toBe(59);
    expect(options.runs).toBe(50);
    expect(options.days).toBe(10);
    expect(options.players).toBe(5);
    expect(options.overview).toBe(true);
  });

  it("マトリクスを2次元で読む", () => {
    const options = parseArgs(["--matrix", "days=10,20", "players=4,5"]);
    expect(options.matrix).toEqual({ days: [10, 20], players: [4, 5] });
    expect(options.overview).toBe(false);
  });

  it("スイープと比較を読む", () => {
    const options = parseArgs([
      "--sweep",
      "balance.startingTokens=0,1,2",
      "--compare",
      "base,substitution",
      "--weights",
      "focus=1,greed=-1,urgency=0.5",
    ]);
    expect(options.sweep?.key).toBe("startingTokens");
    expect(options.sweep?.values).toEqual([0, 1, 2]);
    expect(options.compare).toEqual(["base", "substitution"]);
    expect(options.weights?.all).toEqual({ focus: 1, greed: -1, urgency: 0.5 });
  });

  it("チームメイトのプロファイルを読む", () => {
    expect(parseArgs([]).aiProfile).toBe("strong");
    expect(parseArgs(["--ai-profile", "strong"]).aiProfile).toBe("strong");
    expect(() => parseArgs(["--ai-profile", "unknown"])).toThrow("--ai-profile must be");
  });

  it("Monte Carloオプションを読む", () => {
    const options = parseArgs([
      "--mc",
      "--samples",
      "16",
      "--mc-seeds",
      "12",
      "--mc-seed",
      "7",
      "--mc-scope",
      "ai",
      "--top",
      "5",
    ]);
    expect(options.montecarlo).toBe(true);
    expect(options.samples).toBe(16);
    expect(options.mcSeeds).toBe(12);
    expect(options.mcSeed).toBe(7);
    expect(options.mcScope).toBe("ai");
    expect(options.top).toBe(5);
  });

  it("選択肢以外の日数を拒否する", () => {
    expect(() => parseArgs(["--days", "15"])).toThrow("--days must be one of");
  });

  it("generationSwingの上限を拒否する", () => {
    expect(() => parseArgs(["--sweep", "generationSwing=0,0.3"])).toThrow(
      "generationSwing must be between 0 and 0.2",
    );
  });

  it("未知のシナリオを拒否する", () => {
    expect(() => parseArgs(["--scenario", "unknown"])).toThrow("unknown scenario");
  });
});
