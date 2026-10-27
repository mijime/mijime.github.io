import type { EdgeRef, FloorPlan } from "../../types";
import type { FloorStress } from "../../floor/structural-report";
import { suggestWallRun } from "../../floor/wall-quantity";
import { MiniRow, mono, PanelSection } from "./primitives";
import { QuadrantRows } from "./QuadrantRows";

/** 分布: 四分割 + 偏心率（剛心・重心・弾力半径）+ 改善提案。 */
export function BalanceTab({
  floor,
  stress,
  onAddWalls,
}: {
  floor: FloorPlan;
  stress: FloorStress;
  onAddWalls: (edges: EdgeRef[]) => void;
}) {
  const ecc = stress.eccentricity;
  // 偏心率 NG のとき、最も壁が少ない象限に壁を足す提案を出す。
  let weak: (typeof stress.quadrant.quadrants)[number] | undefined;
  for (const q of stress.quadrant.quadrants) {
    if (!weak || q.h + q.v < weak.h + weak.v) {
      weak = q;
    }
  }
  const weakerKind =
    stress.strength.hMultiplierLengthM <= stress.strength.vMultiplierLengthM ? "h" : "v";
  const weakSuggestion = weak ? suggestWallRun(floor, weak.name, weakerKind) : null;
  return (
    <>
      <QuadrantRows floor={floor} balance={stress.quadrant} onAddWalls={onAddWalls} />
      <PanelSection>
        <MiniRow
          label="偏心率"
          ok={ecc?.ok}
          value={ecc ? `eX${ecc.ex.toFixed(2)} eY${ecc.ey.toFixed(2)}` : "—"}
        />
        <MiniRow
          label="重心ずれ"
          ok={ecc?.ok}
          value={
            ecc
              ? `X${(Math.abs(ecc.gxMm - ecc.cxMm) / 1000).toFixed(2)} Y${(
                  Math.abs(ecc.gyMm - ecc.cyMm) / 1000
                ).toFixed(2)}m`
              : "—"
          }
        />
        <div style={{ color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>
          偏心率は「重さの中心（重心）」と「壁の中心（剛心）」のズレ（目安 0.3 以下）。
        </div>
      </PanelSection>
      {ecc && !ecc.ok && weak && (
        <PanelSection>
          <div style={{ ...mono, color: "var(--terra)", fontSize: "10px" }}>
            壁の配置が偏っています（{weak.name} が最も少ない）
          </div>
          {weakSuggestion ? (
            <button
              onClick={() => onAddWalls(weakSuggestion.edges)}
              style={{
                background: "var(--ink)",
                border: "none",
                borderRadius: "4px",
                color: "var(--paper)",
                cursor: "pointer",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "9px",
                padding: "3px 6px",
                alignSelf: "flex-start",
              }}
            >
              ＋ {weak.name} に追加（{weakerKind === "h" ? "横" : "縦"}壁 {weakSuggestion.cells}
              マス）
            </button>
          ) : (
            <div style={{ ...mono, color: "var(--mid)", fontSize: "9px" }}>
              追加できる空き壁ラインがありません。壁の位置を整理してください。
            </div>
          )}
        </PanelSection>
      )}
    </>
  );
}
