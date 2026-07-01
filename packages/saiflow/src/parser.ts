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

    const parsed = parseEventLine(parts);
    if (!parsed) {
      errors.push({ line: lineNum, message: "年は数値である必要があります" });
      continue;
    }
    const { name, group, startYear, endYear, opsStart } = parsed;

    const ops: AssetOp[] = [];
    for (let j = opsStart; j < parts.length; j++) {
      const opStr = parts[j].trim();
      const op = parseOp(opStr);
      if (!op) {
        errors.push({ line: lineNum, message: `"${opStr}" を解析できません` });
        continue;
      }
      ops.push(op);
    }

    currentEvents.push({ name, group, startYear, endYear, ops });
  }

  // Push last scenario
  scenarios.push({ name: currentName, events: currentEvents });

  return { scenarios, errors };
}

function parseEventLine(parts: string[]): {
  group: string | undefined;
  name: string;
  startYear: number;
  endYear: number | null;
  opsStart: number;
} | null {
  const isOldFormat = !isNaN(Number(parts[1].trim()));

  const group: string | undefined = isOldFormat ? undefined : parts[0].trim() || undefined;
  const name: string = isOldFormat ? parts[0].trim() : parts[1].trim();
  const startYear = Number((isOldFormat ? parts[1] : parts[2]).trim());
  const endYearStr = (isOldFormat ? parts[2] : parts[3]).trim();
  const endYear: number | null = endYearStr.length === 0 ? null : Number(endYearStr);
  const opsStart: number = isOldFormat ? 3 : 4;

  if (isNaN(startYear) || (endYear !== null && isNaN(endYear))) {
    return null;
  }

  return { group, name, startYear, endYear, opsStart };
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
