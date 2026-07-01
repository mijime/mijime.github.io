import { useSaiflowState } from "../store";
import { computeCategories } from "../categories";

export function CategoryTable() {
  const state = useSaiflowState();
  const { rows } = state;

  if (!rows || rows.length === 0) return null;

  const { allCategories, breakdowns } = computeCategories(rows);

  const denseCats = allCategories.filter((cat) => breakdowns.some((b) => b.net[cat] !== 0));

  return (
    <div className="h-full overflow-auto">
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
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((b) => {
            const totalIncome = denseCats.reduce((s, c) => s + (b.income[c] ?? 0), 0);
            const totalExpense = denseCats.reduce((s, c) => s + (b.expense[c] ?? 0), 0);
            const net = totalIncome - totalExpense;
            const netNegative = net < 0;
            return (
              <tr key={b.age} className={netNegative ? "bg-red-100 dark:bg-red-950" : ""}>
                <td className="px-2 py-0.5 border-b border-(--border)">{b.age}</td>
                {denseCats.map((cat) => {
                  const v = b.net[cat] ?? 0;
                  if (v === 0) {
                    return (
                      <td
                        key={cat}
                        className="px-2 py-0.5 text-right border-b border-(--border) opacity-30"
                      >
                        0
                      </td>
                    );
                  }
                  const neg = v < 0;
                  return (
                    <td
                      key={cat}
                      className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${neg ? "text-red-500" : ""}`}
                    >
                      {neg ? fmt(Math.abs(v)) : fmt(v)}
                    </td>
                  );
                })}
                <td className="px-2 py-0.5 text-right border-b border-(--border) tabular-nums">
                  {fmt(totalIncome)}
                </td>
                <td className="px-2 py-0.5 text-right border-b border-(--border) tabular-nums">
                  {fmt(totalExpense)}
                </td>
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) tabular-nums ${netNegative ? "text-red-500" : ""}`}
                >
                  {fmt(Math.abs(net))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
