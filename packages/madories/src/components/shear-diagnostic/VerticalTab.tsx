import { SUPPORT_SPAN_MAX_M } from "../../floor/floor-support";
import type { StructuralReport } from "../../floor/structural-report";
import { MiniRow, mono, PanelSection } from "./primitives";

/** 上下関係タブ: 上下壁量バランス + 床支持 + 通りズレ（階をまたぐ指標）。 */
export function VerticalTab({ report }: { report: StructuralReport }) {
  const { interFloor, support, breaksHere, breaksBelow } = report;
  return (
    <>
      <PanelSection>
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
      {(breaksHere.length > 0 || breaksBelow.length > 0) && (
        <div
          style={{
            ...mono,
            borderTop: "1px solid var(--border)",
            color: "var(--mid)",
            display: "flex",
            flexDirection: "column",
            fontSize: "10px",
            gap: "2px",
            paddingTop: "6px",
          }}
        >
          {breaksHere.length > 0 && <span>▹ 通りズレ:上階壁 ×{breaksHere.length}</span>}
          {breaksBelow.length > 0 && <span>▹ 通りズレ:下階壁 ×{breaksBelow.length}</span>}
        </div>
      )}
    </>
  );
}
