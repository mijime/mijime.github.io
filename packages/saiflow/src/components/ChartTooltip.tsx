interface TooltipData {
  x: number;
  y: number;
  lines: { label: string; value: string; color?: string }[];
}

export function ChartTooltip({ data }: { data: TooltipData | null }) {
  if (!data) return null;
  return (
    <div
      className="fixed pointer-events-none bg-(--toolbar-bg) border border-(--border) rounded px-2 py-1 text-xs shadow z-50"
      style={{ left: data.x + 8, top: data.y - 4 }}
    >
      {data.lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          {l.color && (
            <span
              className="inline-block w-2 h-2 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: l.color }}
            />
          )}
          <span className="text-(--ink) opacity-60">{l.label}</span>
          <span className="text-(--ink) tabular-nums">{l.value}</span>
        </div>
      ))}
    </div>
  );
}
