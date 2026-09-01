import type { StructuralReport } from "../../floor/structural-report";
import { Chip } from "./primitives";

/** 8 つの簡易チェックを OK/NG で一覧した、一目で分かるサマリ。 */
export function SummaryBar({ report }: { report: StructuralReport }) {
  const {
    wallQuantity,
    quadrant,
    balanceRatio,
    eccentricity,
    perimeter,
    interFloor,
    support,
    breaksHere,
    breaksBelow,
  } = report;

  const chips: {
    label: string;
    ok: boolean | undefined;
    count: number;
  }[] = [
    {
      label: "壁量",
      ok: wallQuantity.okH && wallQuantity.okV,
      count: 0,
    },
    {
      label: "四分割",
      ok: quadrant.quadrants.length > 0 ? quadrant.quadrants.every((q) => q.ok) : undefined,
      count: quadrant.quadrants.filter((q) => !q.ok).length,
    },
    { label: "縦横比", ok: balanceRatio.ok, count: 0 },
    { label: "偏心率", ok: eccentricity?.ok, count: 0 },
    { label: "外周", ok: perimeter?.ok, count: 0 },
    { label: "上下壁量", ok: interFloor?.ok, count: 0 },
    {
      label: "床支持",
      ok: support ? support.overCount === 0 : undefined,
      count: support?.overCount ?? 0,
    },
    {
      label: "通りズレ",
      ok: breaksHere.length === 0 && breaksBelow.length === 0,
      count: breaksHere.length + breaksBelow.length,
    },
  ];

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        paddingTop: "6px",
      }}
    >
      {chips.map((c) => (
        <Chip key={c.label} label={c.label} ok={c.ok} count={c.count} />
      ))}
    </div>
  );
}
