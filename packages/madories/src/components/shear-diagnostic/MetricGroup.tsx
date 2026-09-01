import { SUPPORT_SPAN_MAX_M } from "../../floor/floor-support";
import type { StructuralReport } from "../../floor/structural-report";
import { MiniRow, mono, PanelSection } from "./primitives";

export function MetricGroup({ report }: { report: StructuralReport }) {
  const { balanceRatio, eccentricity: ecc, perimeter: perim, interFloor, support } = report;
  return (
    <PanelSection>
      <MiniRow
        label="縦/横比"
        ok={balanceRatio.ok}
        value={
          balanceRatio.h > 0 && balanceRatio.v > 0
            ? `${Math.round(balanceRatio.ratio * 100)}%`
            : "片方向のみ"
        }
      />
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
      {interFloor === undefined ? (
        <MiniRow label="上下壁量" ok={undefined} value="—" />
      ) : interFloor.ok ? (
        <MiniRow label="上下壁量" ok={true} value="OK" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ ...mono, color: "var(--terra)", fontSize: "10px" }}>
            上下壁量 NG（この階 &lt; 上階）
          </div>
          {interFloor.hDeficit > 0 && (
            <div style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>
              横: この階 {interFloor.hLower.toFixed(1)}m &lt; 上階 {interFloor.hUpper.toFixed(1)}
              m（不足 {interFloor.hDeficit.toFixed(1)}m）
            </div>
          )}
          {interFloor.vDeficit > 0 && (
            <div style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>
              縦: この階 {interFloor.vLower.toFixed(1)}m &lt; 上階 {interFloor.vUpper.toFixed(1)}
              m（不足 {interFloor.vDeficit.toFixed(1)}m）
            </div>
          )}
        </div>
      )}
      <MiniRow
        label="床支持"
        ok={support ? support.overCount === 0 : undefined}
        value={
          support
            ? support.overCount > 0
              ? `>${SUPPORT_SPAN_MAX_M}m ×${support.overCount}（max ${support.maxSpanM.toFixed(1)}m）`
              : "OK"
            : "—"
        }
      />
    </PanelSection>
  );
}
