import { useMemo, useState } from "react";
import { Button, SegmentedControl } from "@mijime/theme/ui";
import { useSaiflowState } from "../store";
import { computeCategories, type CategoryBreakdown } from "../categories";
import type { YearRow } from "../types";
import { fmt } from "../utils";

function perAssetIncExp(ops: YearRow["operations"]): Map<string, { inc: number; exp: number }> {
  const map = new Map<string, { inc: number; exp: number }>();
  for (const { op } of ops) {
    const e = map.get(op.asset) ?? { inc: 0, exp: 0 };
    if (op.op === "+") e.inc += op.value;
    if (op.op === "-") e.exp += op.value;
    map.set(op.asset, e);
  }
  return map;
}

function fmtRounded(n: number): string {
  return fmt(Math.round(n));
}
function fmtDelta(d: number): string {
  if (d === 0) return "±0";
  return d > 0 ? `+${fmtRounded(d)}` : fmtRounded(d);
}

function downloadCsv(
  rows: YearRow[],
  cats: string[],
  assetNames: string[],
  breakdowns: CategoryBreakdown[],
) {
  const header = ["年齢", ...cats, "収入(現金)", "支出(現金)", "現金収支", ...assetNames, "総資産"];
  const lines = [header.join(",")];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const b = breakdowns[i];
    const row = [
      r.age,
      ...cats.map((c) => b.net[c] ?? 0),
      r.totalIncome,
      r.totalExpense,
      r.totalIncome - r.totalExpense,
      ...assetNames.map((a) => r.balances[a] ?? 0),
      r.totalAssets,
    ];
    lines.push(row.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "saiflow.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function SummaryTable() {
  const state = useSaiflowState();
  const { rows } = state;
  const [mode, setMode] = useState<"compact" | "detail">("compact");
  const showCategories = mode === "detail";

  const { allCategories, breakdowns } = useMemo(() => {
    if (!rows || rows.length === 0) return { allCategories: [], breakdowns: [] };
    return computeCategories(rows);
  }, [rows]);

  const denseCats = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return allCategories.filter((cat) =>
      breakdowns.some((b) => (b.income[cat] ?? 0) > 0 || (b.expense[cat] ?? 0) > 0),
    );
  }, [allCategories, breakdowns]);

  const assetNames = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const set = new Set<string>();
    for (const row of rows) {
      for (const a of Object.keys(row.balances)) set.add(a);
    }
    return [...set].toSorted();
  }, [rows]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 px-2 py-1 flex-wrap">
        <span className="text-[10px] text-(--ink) opacity-30">
          金額単位: 万円（借入・積立・運用益は含まない現金ベース）
        </span>
        <SegmentedControl
          ariaLabel="表示密度"
          value={mode}
          onChange={setMode}
          options={[
            { value: "compact", label: "コンパクト" },
            { value: "detail", label: "詳細" },
          ]}
          className="ml-auto"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadCsv(rows, denseCats, assetNames, breakdowns)}
        >
          CSVダウンロード
        </Button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-(--toolbar-bg)">
          <tr>
            <th className="sticky left-0 z-20 bg-(--toolbar-bg) px-2 py-1 text-left border-b border-(--border)">
              年齢
            </th>
            {showCategories &&
              denseCats.map((cat) => (
                <th key={cat} className="px-2 py-1 text-right border-b border-(--border)">
                  {cat}
                </th>
              ))}
            <th className="px-2 py-1 text-right border-b border-(--border)">収入(現金)</th>
            <th className="px-2 py-1 text-right border-b border-(--border)">支出(現金)</th>
            <th className="px-2 py-1 text-right border-b border-(--border)">現金収支</th>
            {assetNames.map((name) => (
              <th key={name} className="px-2 py-1 text-right border-b border-(--border)">
                {name}
              </th>
            ))}
            <th className="px-2 py-1 text-right border-b border-(--border)">総資産</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const b = breakdowns[i];
            const ieMap = perAssetIncExp(row.operations);
            const net = row.totalIncome - row.totalExpense;
            const netNegative = net < 0;
            return (
              <tr key={i} className={netNegative ? "bg-red-100 dark:bg-red-950" : ""}>
                <td
                  className={`sticky left-0 z-10 px-2 py-0.5 border-b border-(--border) ${
                    netNegative ? "bg-red-100 dark:bg-red-950" : "bg-(--paper)"
                  }`}
                >
                  {row.age}
                </td>
                {showCategories &&
                  denseCats.map((cat) => {
                    const v = b.net[cat] ?? 0;
                    const inc = b.income[cat] ?? 0;
                    const exp = b.expense[cat] ?? 0;
                    if (v === 0 && inc === 0 && exp === 0) {
                      return (
                        <td
                          key={cat}
                          className="px-2 py-0.5 text-right border-b border-(--border) opacity-30"
                        >
                          0
                        </td>
                      );
                    }
                    return (
                      <td
                        key={cat}
                        className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${v < 0 ? "text-red-500" : ""}`}
                      >
                        {fmtRounded(v)}
                      </td>
                    );
                  })}
                <td className="px-2 py-0.5 text-right border-b border-(--border) tabular-nums">
                  {fmtRounded(row.totalIncome)}
                </td>
                <td className="px-2 py-0.5 text-right border-b border-(--border) tabular-nums">
                  {fmtRounded(row.totalExpense)}
                </td>
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${netNegative ? "text-red-500" : ""}`}
                >
                  {fmtRounded(net)}
                </td>
                {assetNames.map((name) => {
                  const v = row.balances[name] ?? 0;
                  const prev = i > 0 ? (rows[i - 1].balances[name] ?? 0) : 0;
                  const delta = i > 0 ? v - prev : 0;
                  const neg = v < 0;
                  const ie = ieMap.get(name);
                  return (
                    <td
                      key={name}
                      className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${neg ? "text-red-500" : ""}`}
                    >
                      {fmtRounded(v)}
                      {i > 0 && (
                        <span
                          className={`ml-1 text-[10px] ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-400" : "opacity-30"}`}
                        >
                          ({fmtDelta(delta)})
                        </span>
                      )}
                      {ie && (ie.inc > 0 || ie.exp > 0) && (
                        <div className="text-[10px] leading-tight opacity-70">
                          {ie.inc > 0 && (
                            <span className="text-green-600">+{fmtRounded(ie.inc)}</span>
                          )}
                          {ie.inc > 0 && ie.exp > 0 && " "}
                          {ie.exp > 0 && (
                            <span className="text-red-400">-{fmtRounded(ie.exp)}</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${row.totalAssets < 0 ? "text-red-500" : ""}`}
                >
                  {fmtRounded(row.totalAssets)}
                  {i > 0 && (
                    <span
                      className={`ml-1 text-[10px] ${row.totalAssets - rows[i - 1].totalAssets > 0 ? "text-green-600" : row.totalAssets - rows[i - 1].totalAssets < 0 ? "text-red-400" : "opacity-30"}`}
                    >
                      ({fmtDelta(row.totalAssets - rows[i - 1].totalAssets)})
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
