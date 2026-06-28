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

    if (line.startsWith("#") && !line.startsWith("# ")) continue;

    if (line.startsWith("# ")) {
      if (currentName !== "デフォルト" || currentEvents.length > 0) {
        scenarios.push({ name: currentName, events: currentEvents });
      }
      currentName = line.slice(2).trim();
      currentEvents = [];
      continue;
    }

    const lineNum = i + 1;
    const parts = line.split(",");
    if (parts.length < 4) {
      errors.push({
        line: lineNum,
        message: `"イベント名,開始年,終了年,操作..." 形式である必要があります`,
      });
      continue;
    }

    const isOldFormat = !isNaN(Number(parts[1].trim()));
    let group: string | undefined;
    let name: string;
    let startYear: number;
    let endYear: number | null;
    let endYearStr: string;
    let opsStart: number;

    if (isOldFormat) {
      group = undefined;
      name = parts[0].trim();
      startYear = Number(parts[1].trim());
      endYearStr = parts[2].trim();
      endYear = endYearStr.length === 0 ? null : Number(endYearStr);
      opsStart = 3;
    } else {
      const groupStr = parts[0].trim();
      group = groupStr.length > 0 ? groupStr : undefined;
      name = parts[1].trim();
      startYear = Number(parts[2].trim());
      endYearStr = parts[3].trim();
      endYear = endYearStr.length === 0 ? null : Number(endYearStr);
      opsStart = 4;
    }

    if (isNaN(startYear) || (endYear !== null && isNaN(endYear))) {
      errors.push({ line: lineNum, message: "年は数値である必要があります" });
      continue;
    }

    const ops: AssetOp[] = [];
    for (let j = opsStart; j < parts.length; j++) {
      const opStr = parts[j].trim();
      const parsed = parseOp(opStr);
      if (!parsed) {
        errors.push({ line: lineNum, message: `"${opStr}" を解析できません` });
        continue;
      }
      ops.push(parsed);
    }

    currentEvents.push({ name, group, startYear, endYear, ops });
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
