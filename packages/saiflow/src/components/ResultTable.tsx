import { useSaiflowState } from "../store";

export function ResultTable() {
  const state = useSaiflowState();
  const { rows } = state;

  if (!rows || rows.length === 0) return null;

  const assetNames = [...new Set(rows.flatMap((r) => Object.keys(r.balances)))];

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-(--toolbar-bg)">
          <tr>
            <th className="px-2 py-1 text-left border-b border-(--border)">年齢</th>
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
            const net = row.totalIncome - row.totalExpense;
            const netNegative = net < 0;
            return (
              <tr key={i} className={netNegative ? "bg-red-100 dark:bg-red-950" : ""}>
                <td className="px-2 py-0.5 border-b border-(--border)">{row.age}</td>
                <td className="px-2 py-0.5 text-right border-b border-(--border)">
                  {fmt(row.totalIncome)}
                </td>
                <td className="px-2 py-0.5 text-right border-b border-(--border)">
                  {fmt(row.totalExpense)}
                </td>
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) ${netNegative ? "text-red-500" : ""}`}
                >
                  {fmt(net)}
                </td>
                {assetNames.map((name) => (
                  <td
                    key={name}
                    className={`px-2 py-0.5 text-right border-b border-(--border) ${(row.balances[name] ?? 0) < 0 ? "text-red-500" : ""}`}
                  >
                    {fmt(row.balances[name] ?? 0)}
                  </td>
                ))}
                <td
                  className={`px-2 py-0.5 text-right border-b border-(--border) ${row.totalAssets < 0 ? "text-red-500" : ""}`}
                >
                  {fmt(row.totalAssets)}
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
