import { describe, it, expect } from "vitest";
import { parseDSL } from "./parser";

describe("parseDSL", () => {
  it("parses scenario from # header", () => {
    const text = "# 現状維持\n現金,0,0,現金+1000\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].name).toBe("現状維持");
    expect(result.scenarios[0].events).toHaveLength(1);
  });

  it("parses default scenario name when no header", () => {
    const text = "現金,0,0,現金+1000\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].name).toBe("デフォルト");
  });

  it("parses events with single op", () => {
    const text = "# テスト\n年収(夫),6,12,現金+500\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events).toHaveLength(1);
    expect(result.scenarios[0].events[0]).toEqual({
      name: "年収(夫)",
      startAge: 6,
      endAge: 12,
      ops: [{ asset: "現金", op: "+", value: 500 }],
    });
  });

  it("parses events with multiple ops", () => {
    const text = "# テスト\nNISA積立,0,20,現金-60,NISA+60\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].ops).toEqual([
      { asset: "現金", op: "-", value: 60 },
      { asset: "NISA", op: "+", value: 60 },
    ]);
  });

  it("parses event with empty endAge as null", () => {
    const text = "# テスト\n生活費,0,,現金-250\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].endAge).toBeNull();
  });

  it("parses * op", () => {
    const text = "# テスト\nNISA運用,0,,NISA*1.03\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].ops[0]).toEqual({
      asset: "NISA",
      op: "*",
      value: 1.03,
    });
  });

  it("parses multiple scenarios", () => {
    const text = [
      "# 現状維持",
      "現金,0,0,現金+1000",
      "年収(夫),0,25,現金+500",
      "",
      "# 早期リタイア",
      "現金,0,0,現金+1000",
      "年収(夫),0,15,現金+500",
      "生活費,16,,現金-200",
    ].join("\n");
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios).toHaveLength(2);
    expect(result.scenarios[0].name).toBe("現状維持");
    expect(result.scenarios[0].events).toHaveLength(2);
    expect(result.scenarios[1].name).toBe("早期リタイア");
    expect(result.scenarios[1].events).toHaveLength(3);
  });

  it("returns errors for invalid event with too few fields", () => {
    const text = "# テスト\nname,0\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
  });

  it("returns errors for invalid year", () => {
    const text = "# テスト\nname,a,b,現金+100\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(1);
  });

  it("returns errors for unparseable op", () => {
    const text = "# テスト\nname,0,0,invalid\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(1);
  });

  it("ignores empty lines and comment-only lines", () => {
    const text = "# テスト\n\n#comment\n現金,0,0,現金+1000\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events).toHaveLength(1);
  });

  it("skips #comment lines without space", () => {
    const text = "# 現状維持\n現金,0,0,現金+1000\n#comment\n# 別\n投資,0,0,NISA+500\n";
    const result = parseDSL(text);
    expect(result.errors).toEqual([]);
    expect(result.scenarios).toHaveLength(2);
    expect(result.scenarios[0].events).toHaveLength(1);
    expect(result.scenarios[1].events).toHaveLength(1);
  });

  it("parses negative float values", () => {
    const text = "# テスト\ntest,0,0,現金-3.5\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].ops[0].value).toBe(3.5);
  });

  it("parses event with zero-value op", () => {
    const text = "# テスト\ntest,0,0,現金+0\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].ops[0].value).toBe(0);
  });

  it("trims whitespace from lines", () => {
    const text = "# テスト\n  現金,0,0,現金+1000  \n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events).toHaveLength(1);
  });

  it("handles scenario with no events", () => {
    const text = "# 空のシナリオ\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].name).toBe("空のシナリオ");
    expect(result.scenarios[0].events).toHaveLength(0);
  });

  it("parses new format with group column", () => {
    const text = "# 現状維持\n住宅ローン,借入,0,35,現金-100\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0]).toEqual({
      name: "借入",
      group: "住宅ローン",
      startAge: 0,
      endAge: 35,
      ops: [{ asset: "現金", op: "-", value: 100 }],
    });
  });

  it("parses new format with empty group", () => {
    const text = "# 現状維持\n,初期現金,0,0,現金+1000\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0]).toEqual({
      name: "初期現金",
      group: undefined,
      startAge: 0,
      endAge: 0,
      ops: [{ asset: "現金", op: "+", value: 1000 }],
    });
  });

  it("parses old format (no group column) as backward compat", () => {
    const text = "# 現状維持\n年収,0,25,現金+500\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].group).toBeUndefined();
    expect(result.scenarios[0].events[0].name).toBe("年収");
  });

  it("parses new format with null endAge", () => {
    const text = "# テスト\n初期設定,生活費,0,,現金-250\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].endAge).toBeNull();
  });
});
