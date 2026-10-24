import { distribution, formatNumber, histogram } from "./stats";

export function heading(title: string): void {
  console.log(`\n== ${title} ==`);
}

export function subheading(title: string): void {
  console.log(`\n-- ${title}`);
}

export function line(label: string, value: string, indent = 2): void {
  console.log(`${" ".repeat(indent)}${label.padEnd(24)} ${value}`);
}

export function printDistribution(label: string, values: number[], indent = 2): void {
  const stats = distribution(values);
  console.log(
    `${" ".repeat(indent)}${label.padEnd(18)} n=${String(stats.n).padStart(5)} min=${formatNumber(stats.min)} p10=${formatNumber(stats.p10)} p25=${formatNumber(stats.p25)} med=${formatNumber(stats.median)} p75=${formatNumber(stats.p75)} p90=${formatNumber(stats.p90)} p95=${formatNumber(stats.p95)} max=${formatNumber(stats.max)} avg=${formatNumber(stats.mean)} sd=${formatNumber(stats.stddev)}`,
  );
}

export function printHistogram(values: number[], width = 32, bins = 10, indent = 2): void {
  const rows = histogram(values, bins);
  const max = Math.max(1, ...rows.map((row) => row.count));
  for (const row of rows) {
    const bar = "█".repeat(Math.round((row.count / max) * width));
    console.log(
      `${" ".repeat(indent)}${formatNumber(row.start, 0).padStart(4)}-${formatNumber(row.end, 0).padEnd(4)} ${String(row.count).padStart(4)} ${bar}`,
    );
  }
}

export function printBar(label: string, value: number, max: number, width = 24): void {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const bar = "█".repeat(Math.round(ratio * width));
  console.log(`  ${label.padEnd(18)} ${bar.padEnd(width)} ${value}`);
}

export function printTable(headers: string[], rows: string[][], indent = 2): void {
  if (rows.length === 0) return;
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );
  const render = (row: string[]) =>
    `${" ".repeat(indent)}${row
      .map((cell, index) => (cell ?? "").padEnd(widths[index] ?? 0))
      .join("  ")
      .trimEnd()}`;
  console.log(render(headers));
  console.log(`${" ".repeat(indent)}${widths.map((width) => "-".repeat(width)).join("  ")}`);
  for (const row of rows) console.log(render(row));
}
