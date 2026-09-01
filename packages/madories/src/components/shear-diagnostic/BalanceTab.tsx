import type { EdgeRef, FloorPlan } from "../../types";
import type { StructuralReport } from "../../floor/structural-report";
import { MiniRow, PanelSection } from "./primitives";
import { QuadrantRows } from "./QuadrantRows";

/** 平面バランス・分布タブ: 四分割 + 偏心率 + 外周耐力。 */
export function BalanceTab({
  floor,
  report,
  onAddWalls,
}: {
  floor: FloorPlan;
  report: StructuralReport;
  onAddWalls: (edges: EdgeRef[]) => void;
}) {
  const ecc = report.eccentricity;
  const perim = report.perimeter;
  return (
    <>
      <QuadrantRows floor={floor} balance={report.quadrant} onAddWalls={onAddWalls} />
      <PanelSection>
        <MiniRow
          label="偏心率"
          ok={ecc?.ok}
          value={ecc ? `eX${ecc.ex.toFixed(2)} eY${ecc.ey.toFixed(2)}` : "—"}
        />
        <MiniRow
          label="外周耐力"
          ok={perim?.ok}
          value={perim ? `${Math.round(perim.ratio * 100)}%` : "—"}
        />
      </PanelSection>
    </>
  );
}
