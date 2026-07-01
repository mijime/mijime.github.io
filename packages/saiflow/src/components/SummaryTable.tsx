import { useMemo } from "react";
import { useSaiflowState } from "../store";
import { computeCategories, type CategoryBreakdown, categoryName } from "../categories";
import type { YearRow } from "../types";

function adjustedTotals(ops: YearRow["operations"]): { income: number; expense: number } {
  const byEvent = new Map<string, { inc: number; exp: number }>();
  for (const { eventName, op } of ops) {
    const e = byEvent.get(eventName) ?? { inc: 0, exp: 0 };
    if (op.op === "+") e.inc += op.value;
    if (op.op === "-") e.exp += op.value;
    byEvent.set(eventName, e);
  }
  let income = 0;
  let expense = 0;
  for (const { inc, exp } of byEvent.values()) {
    if (inc > exp) income += inc - exp;
    if (exp > inc) expense += exp - inc;
  }
  return { income, expense };
}

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

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

function fmtDelta(d: number): string {
  if (d === 0) return "±0";
  return d > 0 ? `+${fmt(d)}` : fmt(d);
}

function downloadCsv(
  rows: YearRow[],
  cats: string[],
  assetNames: string[],
  breakdowns: CategoryBreakdown[],
  cashAsset: string,
) {
  const header = ["年齢", ...cats, "収入計", "支出計", "収支", ...assetNames, "総資産"];
  const lines = [header.join(",")];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const b = breakdowns[i];
    const adj = adjustedTotals(r.operations);
    const net = adj.income - adj.expense;
    const row = [
      r.age,
      ...cats.map((c) => {
        const v = b.net[c] ?? 0;
        if (v !== 0) return v;
        const inc = b.income[c] ?? 0;
        if (inc === 0) return 0;
        let cashNet = 0;
        for (const { eventName, op } of r.operations) {
          if (categoryName(eventName) !== c || op.asset !== cashAsset) continue;
          if (op.op === "+") cashNet += op.value;
          if (op.op === "-") cashNet -= op.value;
        }
        return cashNet >= 0 ? inc : -inc;
      }),
      adj.income,
      adj.expense,
      net,
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

  const cashAsset = useMemo(
    () => assetNames.find((a) => a === "現金") ?? assetNames[0] ?? "",
    [assetNames],
  );

  if (!rows || rows.length === 0) return null;

  return (
    <div className="h-full overflow-auto">
      <div className="flex justify-end px-2 py-1">
        <button
          className="text-xs text-(--ink) opacity-40 hover:opacity-100 transition-opacity"
          onClick={() => downloadCsv(rows, denseCats, assetNames, breakdowns, cashAsset)}
        >
          CSVダウンロード
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-(--toolbar-bg)">
          <tr>
            <th className="px-2 py-1 text-left border-b border-(--border)">年齢</th>
            {denseCats.map((cat) => (
              <th key={cat} className="px-2 py-1 text-right border-b border-(--border)">
                {cat}
              </th>
            ))}
            <th className="px-2 py-1 text-right border-b border-(--border)">収入計</th>
            <th className="px-2 py-1 text-right border-b border-(--border)">支出計</th>
            <th className="px-2 py-1 text-right border-b border-(--border)">収支</th>
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
            const adj = adjustedTotals(row.operations);
            const ieMap = perAssetIncExp(row.operations);
            const net = adj.income - adj.expense;
            const netNegative = net < 0;
            return (
              <tr key={i} className={netNegative ? "bg-red-100 dark:bg-red-950" : ""}>
                <td className="px-2 py-0.5 border-b border-(--border)">{row.age}</td>
                {denseCats.map((cat) => {
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
                  const display = v !== 0 ? v : inc;
                  const transfer = v === 0;
                  let neg = v < 0;
                  if (transfer && cashAsset) {
                    let cashNet = 0;
                    for (const { eventName, op } of row.operations) {
                      if (categoryName(eventName) !== cat || op.asset !== cashAsset) continue;
                      if (op.op === "+") cashNet += op.value;
                      if (op.op === "-") cashNet -= op.value;
                    }
                    neg = cashNet < 0;
                  }
                  return (
                    <td
                      key={cat}
                      className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${neg ? "text-red-500" : ""}`}
                    >
                      {fmt(Math.abs(display))}
                      {transfer && <span className="ml-0.5 text-[10px] opacity-40">振替</span>}
                    </td>
                  );
                })}
                <td className="px-2 py-0.5 text-right border-b border-(--border) tabular-nums">
                  {fmt(adj.income)}
                </td>
                <td className="px-2 py-0.5 text-right border-b border-(--border) tabular-nums">
                  {fmt(adj.expense)}
                </td>
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${netNegative ? "text-red-500" : ""}`}
                >
                  {fmt(Math.abs(net))}
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
                      {fmt(v)}
                      {i > 0 && (
                        <span
                          className={`ml-1 text-[10px] ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-400" : "opacity-30"}`}
                        >
                          ({fmtDelta(delta)})
                        </span>
                      )}
                      {ie && (ie.inc > 0 || ie.exp > 0) && (
                        <div className="text-[10px] leading-tight opacity-70">
                          {ie.inc > 0 && <span className="text-green-600">+{fmt(ie.inc)}</span>}
                          {ie.inc > 0 && ie.exp > 0 && " "}
                          {ie.exp > 0 && <span className="text-red-400">-{fmt(ie.exp)}</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${row.totalAssets < 0 ? "text-red-500" : ""}`}
                >
                  {fmt(row.totalAssets)}
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
