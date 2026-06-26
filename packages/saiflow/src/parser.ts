import type { AssetOp, Event, ParseError, Scenario, SqlResult } from "./types";

export function parseDSL(text: string): SqlResult {
  const errors: ParseError[] = [];
  const scenarios: Scenario[] = [];
  let currentEvents: Event[] = [];
  let currentName = "デフォルト";

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line.length === 0) continue;

    if (line.startsWith("# ")) {
      if (currentEvents.length > 0 || scenarios.length > 0) {
        scenarios.push({ name: currentName, events: currentEvents });
      }
      currentName = line.slice(2).trim();
      currentEvents = [];
      continue;
    }

    const lineNum = i + 1;
    const parts = line.split(",");
    if (parts.length < 4) {
      errors.push({ line: lineNum, message: `"イベント名,開始年,終了年,操作..." 形式である必要があります` });
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

    currentEvents.push({ name, startYear, endYear, ops });
  }

  // Push last scenario
  scenarios.push({ name: currentName, events: currentEvents });

  return { scenarios, errors };
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
