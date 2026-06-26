import type { AssetOp, Event, ParseError, SimulationConfig } from "./types";

export function parseDSL(text: string): { config: SimulationConfig } | { errors: ParseError[] } {
  const errors: ParseError[] = [];
  const initialAssets: { name: string; value: number }[] = [];
  const events: Event[] = [];

  let section: "none" | "assets" | "events" = "none";

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line.length === 0) continue;

    if (line === "# 初期設定") {
      section = "assets";
      continue;
    }
    if (line === "# イベント") {
      section = "events";
      continue;
    }
    if (line.startsWith("#")) continue;

    const lineNum = i + 1;

    if (section === "assets") {
      const colon = line.indexOf(":");
      if (colon === -1) {
        errors.push({ line: lineNum, message: `"名前:金額" 形式である必要があります` });
        continue;
      }
      const name = line.slice(0, colon).trim();
      const valueStr = line.slice(colon + 1).trim();
      const value = Number(valueStr);
      if (name.length === 0 || isNaN(value)) {
        errors.push({ line: lineNum, message: `"名前:金額" 形式である必要があります` });
        continue;
      }
      initialAssets.push({ name, value });
      continue;
    }

    if (section === "events") {
      const parts = line.split(",");
      if (parts.length < 4) {
        errors.push({
          line: lineNum,
          message: `"イベント名,開始年,終了年,操作..." 形式である必要があります`,
        });
        continue;
      }
      const name = parts[0].trim();
      const startYear = Number(parts[1].trim());
      const endYearStr = parts[2].trim();
      const endYear = endYearStr.length === 0 ? null : Number(endYearStr);

      if (isNaN(startYear) || (endYear !== null && isNaN(endYear))) {
        errors.push({ line: lineNum, message: "年は数値である必要があります" });
        continue;
      }

      const ops: AssetOp[] = [];
      for (let j = 3; j < parts.length; j++) {
        const opStr = parts[j].trim();
        const parsed = parseOp(opStr);
        if (!parsed) {
          errors.push({ line: lineNum, message: `"${opStr}" を解析できません` });
          continue;
        }
        ops.push(parsed);
      }

      events.push({ name, startYear, endYear, ops });
      continue;
    }
  }

  if (errors.length > 0) return { errors };
  return { config: { currentAge: 39, simulationYears: 50, initialAssets, events } };
}

function parseOp(str: string): AssetOp | null {
  const match = str.match(/^(.+?)([+\-*])([\d.]+)$/);
  if (!match) return null;
  return {
    asset: match[1].trim(),
    op: match[2] as "+" | "-" | "*",
    value: Number(match[3]),
  };
}
