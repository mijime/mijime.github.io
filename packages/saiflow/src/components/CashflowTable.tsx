import { useEffect, useMemo, useState, type JSX } from "react";
import { useSaiflowState } from "../store";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

export function CashflowTable() {
  const state = useSaiflowState();
  const { rows } = state;

  if (!rows || rows.length === 0) return null;

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      for (const g of Object.keys(row.groupIncome)) set.add(g);
      for (const g of Object.keys(row.groupExpense)) set.add(g);
    }
    return [...set].sort();
  }, [rows]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups),
  );

  useEffect(() => {
    setExpandedGroups(new Set(groups));
  }, [groups]);

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const bodyRows = useMemo(() => {
    const rowsList: JSX.Element[] = [];
    for (const group of groups) {
      const expanded = expandedGroups.has(group);
      rowsList.push(
        <tr
          key={`${group}-header`}
          className="cursor-pointer hover:bg-(--hover)"
          onClick={() => toggleGroup(group)}
          tabIndex={0}
          role="button"
          aria-expanded={expanded}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleGroup(group);
            }
          }}
        >
          <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) font-bold z-10 whitespace-nowrap">
            <span aria-hidden="true">{expanded ? "▼" : "▶"}</span> {group}
          </td>
          {rows.map((_, i) => (
            <td
              key={i}
              className="px-2 py-0.5 text-right border-b border-(--border)"
            />
          ))}
        </tr>,
      );
      if (expanded) {
        rowsList.push(
          <tr key={`${group}-income`}>
            <td className="sticky left-0 px-2 py-0.5 border-b border-(--border) pl-6 z-10 bg-[rgba(72,187,120,0.08)] whitespace-nowrap">
              収入
            </td>
            {rows.map((row, i) => (
              <td
                key={i}
                className="px-2 py-0.5 text-right border-b border-(--border) bg-[rgba(72,187,120,0.08)]"
              >
                {fmt(row.groupIncome[group] ?? 0)}
              </td>
            ))}
          </tr>,
          <tr key={`${group}-expense`}>
            <td className="sticky left-0 px-2 py-0.5 border-b border-(--border) pl-6 z-10 bg-[rgba(252,129,129,0.08)] whitespace-nowrap">
              支出
            </td>
            {rows.map((row, i) => (
              <td
                key={i}
                className="px-2 py-0.5 text-right border-b border-(--border) bg-[rgba(252,129,129,0.08)]"
              >
                {fmt(row.groupExpense[group] ?? 0)}
              </td>
            ))}
          </tr>,
        );
      }
    }
    rowsList.push(
      <tr key="income-total" className="border-t-2 border-(--border) font-bold">
        <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
          収入合計
        </td>
        {rows.map((row, i) => (
          <td
            key={i}
            className="px-2 py-0.5 text-right border-b border-(--border)"
          >
            {fmt(row.totalIncome)}
          </td>
        ))}
      </tr>,
      <tr key="expense-total" className="font-bold">
        <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
          支出合計
        </td>
        {rows.map((row, i) => (
          <td
            key={i}
            className="px-2 py-0.5 text-right border-b border-(--border)"
          >
            {fmt(row.totalExpense)}
          </td>
        ))}
      </tr>,
      <tr key="net" className="font-bold">
        <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
          収支
        </td>
        {rows.map((row, i) => {
          const net = row.totalIncome - row.totalExpense;
          return (
            <td
              key={i}
              className={`px-2 py-0.5 text-right border-b border-(--border) ${net < 0 ? "text-red-500" : ""}`}
            >
              {fmt(net)}
            </td>
          );
        })}
      </tr>,
      <tr key="assets" className="font-bold">
        <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
          資産残高
        </td>
        {rows.map((row, i) => (
          <td
            key={i}
            className={`px-2 py-0.5 text-right border-b border-(--border) ${row.totalAssets < 0 ? "text-red-500" : ""}`}
          >
            {fmt(row.totalAssets)}
          </td>
        ))}
      </tr>,
    );
    return rowsList;
  }, [rows, expandedGroups, groups]);

  return (
    <div className="h-full overflow-auto">
      <table className="border-collapse text-sm" aria-label="収支シミュレーション結果">
        <thead className="sticky top-0 bg-(--toolbar-bg)">
          <tr>
            <th className="sticky left-0 bg-(--toolbar-bg) px-2 py-1 text-left border-b border-(--border) z-20 whitespace-nowrap">
              グループ
            </th>
            {rows.map((row, i) => (
              <th
                key={i}
                className="px-2 py-1 text-right border-b border-(--border) whitespace-nowrap"
              >
                {row.age}歳
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}
