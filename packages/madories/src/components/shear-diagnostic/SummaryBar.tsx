import type { FloorStress } from "../../floor/structural-report";
import { Chip } from "./primitives";

/** 許容応力度（簡易）チェックを OK/NG で一覧したサマリ。 */
export function SummaryBar({ stress }: { stress: FloorStress }) {
  const { eccentricity, rigidity, drift, quadrant, support, breaksHere, breaksBelow } = stress;

  const chips: { label: string; ok: boolean | undefined; count: number }[] = [
    { count: 0, label: "壁量", ok: stress.wallOkH && stress.wallOkV },
    { count: 0, label: "偏心率", ok: eccentricity?.ok },
    { count: 0, label: "剛性率", ok: rigidity ? rigidity.okH && rigidity.okV : undefined },
    { count: 0, label: "変形角", ok: drift ? drift.okH && drift.okV : undefined },
    {
      count: quadrant.quadrants.filter((q) => !q.ok).length,
      label: "四分割",
      ok: quadrant.quadrants.length > 0 ? quadrant.quadrants.every((q) => q.ok) : undefined,
    },
    {
      count: support?.overCount ?? 0,
      label: "床支持",
      ok: support ? support.overCount === 0 : undefined,
    },
    {
      count: breaksHere.length + breaksBelow.length,
      label: "通りズレ",
      ok: breaksHere.length === 0 && breaksBelow.length === 0,
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
