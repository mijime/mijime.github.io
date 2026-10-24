import { RISK_BY_ID } from "../../../src/data/risks";
import { formatNumber, formatPercent } from "../stats";
import { heading, printTable } from "../format";
import { riskDebtOf, riskDrawnOf } from "../aggregate";
import type { RunResult } from "../runner";

export function printRisks(results: RunResult[]): void {
  const runs = Math.max(1, results.length);
  const totals = new Map<
    string,
    { title: string; drawn: number; absorbed: number; unmet: number; debt: number }
  >();
  let riskDebt = 0;
  let riskDrawn = 0;
  let teamDebt = 0;

  for (const result of results) {
    for (const [id, stat] of Object.entries(result.state.riskStats)) {
      const title = RISK_BY_ID[id]?.title ?? id;
      const entry = totals.get(title) ?? { title, drawn: 0, absorbed: 0, unmet: 0, debt: 0 };
      entry.drawn += stat.drawn;
      entry.absorbed += stat.absorbed;
      entry.unmet += stat.unmet;
      entry.debt += stat.debt;
      totals.set(title, entry);
    }
    riskDebt += riskDebtOf(result.state);
    riskDrawn += riskDrawnOf(result.state);
    teamDebt += result.state.teamDebt;
  }

  heading(`risks  ${results.length} seeds`);
  console.log(
    `  risk draw/game=${formatNumber(riskDrawn / runs)} / risk debt/game=${formatNumber(riskDebt / runs, 2)} / final debt/game=${formatNumber(teamDebt / runs, 2)}`,
  );
  console.log(
    `  absorption rate=${formatPercent(riskDrawn > 0 ? 1 - riskDebt / riskDrawn : 0)} / debt share of draws=${formatNumber(riskDrawn > 0 ? riskDebt / riskDrawn : 0, 2)}`,
  );

  const rows = [...totals.entries()]
    .map(([id, stat]) => ({
      id,
      title: stat.title,
      drawn: stat.drawn,
      absorbed: stat.absorbed,
      unmet: stat.unmet,
      debt: stat.debt,
      rate: stat.drawn > 0 ? stat.debt / stat.drawn : 0,
    }))
    .toSorted((a, b) => b.debt - a.debt || b.drawn - a.drawn);

  printTable(
    ["card", "draw/game", "absorbed", "unmet", "debt/game", "debt/draw", "share"],
    rows.map((row) => [
      row.title,
      formatNumber(row.drawn / runs),
      formatNumber(row.absorbed / runs),
      formatNumber(row.unmet / runs),
      formatNumber(row.debt / runs, 2),
      formatNumber(row.rate, 2),
      formatPercent(riskDebt > 0 ? row.debt / riskDebt : 0),
    ]),
  );
}
