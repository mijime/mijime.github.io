import { describe, it, expect } from "vitest";
import { parseDSL } from "./parser";

describe("parseDSL", () => {
  it("parses initial assets", () => {
    const text = "# 初期設定\n現金:1000\nNISA:500\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.initialAssets).toEqual([
      { name: "現金", value: 1000 },
      { name: "NISA", value: 500 },
    ]);
  });

  it("parses events with single op", () => {
    const text = "# イベント\n年収(夫),0,25,現金+500\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.events).toHaveLength(1);
    expect(result.config.events[0]).toEqual({
      name: "年収(夫)",
      startYear: 0,
      endYear: 25,
      ops: [{ asset: "現金", op: "+", value: 500 }],
    });
  });

  it("parses events with multiple ops", () => {
    const text = "# イベント\nNISA積立,0,20,現金-60,NISA+60\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.events[0].ops).toEqual([
      { asset: "現金", op: "-", value: 60 },
      { asset: "NISA", op: "+", value: 60 },
    ]);
  });

  it("parses event with empty endYear as null", () => {
    const text = "# イベント\n生活費,0,,現金-250\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.events[0].endYear).toBeNull();
  });

  it("parses * op", () => {
    const text = "# イベント\nNISA運用,0,,NISA*1.03\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.events[0].ops[0]).toEqual({
      asset: "NISA",
      op: "*",
      value: 1.03,
    });
  });

  it("parses full DSL with both sections", () => {
    const text = [
      "# 初期設定",
      "現金:1000",
      "NISA:500",
      "",
      "# イベント",
      "年収(夫),0,25,現金+500",
      "生活費,0,,現金-250",
      "NISA運用,0,,NISA*1.03",
    ].join("\n");
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.initialAssets).toHaveLength(2);
    expect(result.config.events).toHaveLength(3);
  });

  it("returns errors for invalid asset line", () => {
    const text = "# 初期設定\ninvalid line\n";
    const result = parseDSL(text);
    if ("config" in result) throw new Error("expected errors");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
  });

  it("returns errors for invalid event with too few fields", () => {
    const text = "# イベント\nname,0\n";
    const result = parseDSL(text);
    if ("config" in result) throw new Error("expected errors");
    expect(result.errors).toHaveLength(1);
  });

  it("ignores empty lines and comment lines", () => {
    const text = "# 初期設定\n\n# comment\n現金:1000\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.initialAssets).toHaveLength(1);
  });

  it("parses negative float values", () => {
    const text = "# イベント\ntest,0,1,現金-3.5\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.events[0].ops[0].value).toBe(3.5);
  });

  it("parses event with zero-value op", () => {
    const text = "# イベント\ntest,0,1,現金+0\n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.events[0].ops[0].value).toBe(0);
  });

  it("trims whitespace from lines", () => {
    const text = "# 初期設定\n  現金:1000  \n";
    const result = parseDSL(text);
    if ("errors" in result) throw new Error("expected config");
    expect(result.config.initialAssets).toHaveLength(1);
  });
});
